import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
  ? `${process.env.NEXT_PUBLIC_URL}/api/fit/oauth-callback`
  : 'http://localhost:3000/api/fit/oauth-callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // Contains user ID

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/patient/health?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/patient/health?error=no_code`);
  }

  try {
    console.log('OAuth callback - Starting token exchange');
    console.log('Client ID exists:', !!GOOGLE_CLIENT_ID);
    console.log('Client Secret exists:', !!GOOGLE_CLIENT_SECRET);
    console.log('Redirect URI:', REDIRECT_URI);
    console.log('State (userId):', state);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${baseUrl}/patient/health?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    console.log('Token exchange successful, access_token received');
    
    // Get user info from state parameter (passed during auth)
    const userId = state;
    
    if (!userId) {
      console.error('No userId in state parameter');
      return NextResponse.redirect(`${baseUrl}/patient/health?error=no_user_state`);
    }

    // Find patient
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      console.error('Patient not found for userId:', userId);
      return NextResponse.redirect(`${baseUrl}/patient/health?error=patient_not_found`);
    }

    console.log('Patient found:', patient.id);

    // Store tokens in database
    await prisma.googleFitToken.upsert({
      where: { patientId: patient.id },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      create: {
        patientId: patient.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    console.log('Tokens stored in database');

    // Fetch initial data
    try {
      await fetchAndStoreGoogleFitData(patient.id, tokenData.access_token);
      console.log('Initial data fetched');
    } catch (dataError) {
      console.error('Failed to fetch initial data:', dataError);
      // Continue anyway - user can sync later
    }

    return NextResponse.redirect(`${baseUrl}/patient/health?connected=true`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/patient/health?error=oauth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
}

async function fetchAndStoreGoogleFitData(patientId: string, accessToken: string) {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    console.log('Fetching initial Google Fit data...');

    // Fetch ALL fitness data in a single request
    const fitnessResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: 'com.google.step_count.delta' },
            { dataTypeName: 'com.google.calories.expended' },
            { dataTypeName: 'com.google.heart_rate.bpm' },
            { dataTypeName: 'com.google.distance.delta' },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    const fitnessData = await fitnessResponse.json();

    if (fitnessData.error) {
      console.error('Google Fit API error:', fitnessData.error);
      return;
    }

    // Process data by date
    const dataByDate: { [key: string]: any } = {};

    if (fitnessData.bucket && fitnessData.bucket.length > 0) {
      fitnessData.bucket.forEach((bucket: any) => {
        const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
        if (!dataByDate[date]) {
          dataByDate[date] = { steps: 0, calories: 0, heartRate: null, distance: 0 };
        }

        bucket.dataset?.forEach((dataset: any) => {
          const dataType = dataset.dataSourceId?.split(':')[1] || '';
          
          dataset.point?.forEach((point: any) => {
            if (dataType.includes('step_count') || dataset.dataSourceId?.includes('step')) {
              point.value?.forEach((v: any) => {
                dataByDate[date].steps += v.intVal || 0;
              });
            } else if (dataType.includes('calories') || dataset.dataSourceId?.includes('calories')) {
              point.value?.forEach((v: any) => {
                dataByDate[date].calories += Math.round(v.fpVal || 0);
              });
            } else if (dataType.includes('heart_rate') || dataset.dataSourceId?.includes('heart')) {
              point.value?.forEach((v: any) => {
                if (v.fpVal) {
                  if (dataByDate[date].heartRate === null) {
                    dataByDate[date].heartRate = Math.round(v.fpVal);
                  } else {
                    dataByDate[date].heartRate = Math.round((dataByDate[date].heartRate + v.fpVal) / 2);
                  }
                }
              });
            } else if (dataType.includes('distance') || dataset.dataSourceId?.includes('distance')) {
              point.value?.forEach((v: any) => {
                dataByDate[date].distance += v.fpVal || 0;
              });
            }
          });
        });
      });
    }

    // Store in database
    let syncedCount = 0;
    for (const [date, data] of Object.entries(dataByDate)) {
      if (data.steps > 0 || data.calories > 0 || data.heartRate || data.distance > 0) {
        await prisma.googleFitData.upsert({
          where: {
            patientId_date: {
              patientId,
              date: new Date(date),
            },
          },
          update: {
            steps: data.steps,
            heartRate: data.heartRate,
            calories: data.calories,
            distance: data.distance ? Math.round(data.distance) : null,
          },
          create: {
            patientId,
            date: new Date(date),
            steps: data.steps,
            heartRate: data.heartRate,
            calories: data.calories,
            distance: data.distance ? Math.round(data.distance) : null,
          },
        });
        syncedCount++;
      }
    }

    console.log('Initial sync complete:', syncedCount, 'days of data');
  } catch (error) {
    console.error('Failed to fetch Google Fit data:', error);
  }
}
