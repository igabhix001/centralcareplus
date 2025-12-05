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

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Get user info from state parameter (passed during auth)
    const userId = state;
    
    if (userId) {
      // Find patient
      const patient = await prisma.patient.findUnique({
        where: { userId },
      });

      if (patient) {
        // Store tokens in database
        await prisma.googleFitToken.upsert({
          where: { patientId: patient.id },
          update: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
          create: {
            patientId: patient.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });

        // Fetch initial data
        console.log('Fetching initial Google Fit data for patient:', patient.id);
        await fetchAndStoreGoogleFitData(patient.id, tokens.access_token);
      }
    }

    return NextResponse.redirect(`${baseUrl}/patient/health?connected=true`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/patient/health?error=oauth_failed`);
  }
}

async function fetchAndStoreGoogleFitData(patientId: string, accessToken: string) {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    console.log('Fetching Google Fit data:', { 
      patientId, 
      startTime: startTime.toISOString(), 
      endTime: endTime.toISOString() 
    });

    // Fetch steps data
    const stepsResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: 'com.google.step_count.delta',
              dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    console.log('Steps API response status:', stepsResponse.status);

    // Fetch heart rate data
    const heartRateResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: 'com.google.heart_rate.bpm',
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    // Fetch calories data
    const caloriesResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: 'com.google.calories.expended',
            },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    const [stepsData, heartRateData, caloriesData] = await Promise.all([
      stepsResponse.json(),
      heartRateResponse.json(),
      caloriesResponse.json(),
    ]);

    console.log('Google Fit API responses:', {
      stepsDataBuckets: stepsData.bucket?.length || 0,
      heartRateDataBuckets: heartRateData.bucket?.length || 0,
      caloriesDataBuckets: caloriesData.bucket?.length || 0,
    });

    // Process and store data
    const dataByDate: { [key: string]: any } = {};

    // Process steps
    stepsData.bucket?.forEach((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const steps = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      if (!dataByDate[date]) dataByDate[date] = {};
      dataByDate[date].steps = steps;
      console.log('Processed steps for', date, ':', steps);
    });

    // Process heart rate
    heartRateData.bucket?.forEach((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const heartRates = bucket.dataset?.[0]?.point?.map((p: any) => p.value?.[0]?.fpVal) || [];
      if (heartRates.length > 0) {
        const avgHeartRate = Math.round(heartRates.reduce((a: number, b: number) => a + b, 0) / heartRates.length);
        if (!dataByDate[date]) dataByDate[date] = {};
        dataByDate[date].heartRate = avgHeartRate;
      }
    });

    // Process calories
    caloriesData.bucket?.forEach((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const calories = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;
      if (!dataByDate[date]) dataByDate[date] = {};
      dataByDate[date].calories = Math.round(calories);
    });

    // Store in database
    for (const [date, data] of Object.entries(dataByDate)) {
      await prisma.googleFitData.upsert({
        where: {
          patientId_date: {
            patientId,
            date: new Date(date),
          },
        },
        update: {
          steps: data.steps || 0,
          heartRate: data.heartRate || null,
          calories: data.calories || 0,
          sleepHours: null, // Google Fit sleep data requires different API
          distance: null,
        },
        create: {
          patientId,
          date: new Date(date),
          steps: data.steps || 0,
          heartRate: data.heartRate || null,
          calories: data.calories || 0,
          sleepHours: null,
          distance: null,
        },
      });
    }
  } catch (error) {
    console.error('Failed to fetch Google Fit data:', error);
  }
}
