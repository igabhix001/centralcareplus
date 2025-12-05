import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    console.log('Sync started for user:', authUser.userId);

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { userId: authUser.userId },
    });

    if (!patient) {
      return errorResponse('Patient not found', 404);
    }

    // Get token
    const fitToken = await prisma.googleFitToken.findUnique({
      where: { patientId: patient.id },
    });

    if (!fitToken) {
      return errorResponse('Google Fit not connected. Please connect first.', 400);
    }

    // Check if token needs refresh
    let accessToken = fitToken.accessToken;
    if (fitToken.expiresAt < new Date()) {
      console.log('Token expired, refreshing...');
      if (!fitToken.refreshToken) {
        return errorResponse('Token expired. Please reconnect Google Fit.', 400);
      }

      // Refresh the token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: fitToken.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', tokenData);
        return errorResponse(`Token refresh failed: ${tokenData.error_description || tokenData.error}`, 400);
      }

      accessToken = tokenData.access_token;

      // Update token in database
      await prisma.googleFitToken.update({
        where: { patientId: patient.id },
        data: {
          accessToken: tokenData.access_token,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        },
      });
      console.log('Token refreshed successfully');
    }

    // Fetch data from Google Fit - use simpler queries without dataSourceId
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    console.log('Fetching Google Fit data from', startTime.toISOString(), 'to', endTime.toISOString());

    // Fetch ALL fitness data in a single request for better reliability
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
          bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    const fitnessData = await fitnessResponse.json();
    console.log('Google Fit API response status:', fitnessResponse.status);

    if (fitnessData.error) {
      console.error('Google Fit API error:', fitnessData.error);
      return jsonResponse({
        success: false,
        error: fitnessData.error.message || 'Google Fit API error',
        details: fitnessData.error,
      });
    }

    // Process data by date
    const dataByDate: { [key: string]: any } = {};
    let totalDataPoints = 0;

    if (fitnessData.bucket && fitnessData.bucket.length > 0) {
      console.log('Processing', fitnessData.bucket.length, 'buckets');

      fitnessData.bucket.forEach((bucket: any) => {
        const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
        if (!dataByDate[date]) {
          dataByDate[date] = { steps: 0, calories: 0, heartRate: null, distance: 0 };
        }

        // Each bucket has multiple datasets (one per aggregateBy)
        bucket.dataset?.forEach((dataset: any) => {
          const dataType = dataset.dataSourceId?.split(':')[1] || '';
          
          dataset.point?.forEach((point: any) => {
            totalDataPoints++;
            
            if (dataType.includes('step_count') || dataset.dataSourceId?.includes('step')) {
              // Sum all step values for the day
              point.value?.forEach((v: any) => {
                dataByDate[date].steps += v.intVal || 0;
              });
            } else if (dataType.includes('calories') || dataset.dataSourceId?.includes('calories')) {
              point.value?.forEach((v: any) => {
                dataByDate[date].calories += Math.round(v.fpVal || 0);
              });
            } else if (dataType.includes('heart_rate') || dataset.dataSourceId?.includes('heart')) {
              // Average heart rate
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

    console.log('Processed data points:', totalDataPoints);
    console.log('Days with data:', Object.keys(dataByDate).length);

    // Store in database
    let syncedCount = 0;
    for (const [date, data] of Object.entries(dataByDate)) {
      // Only store if there's actually some data
      if (data.steps > 0 || data.calories > 0 || data.heartRate || data.distance > 0) {
        await prisma.googleFitData.upsert({
          where: {
            patientId_date: {
              patientId: patient.id,
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
            patientId: patient.id,
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

    console.log('Synced', syncedCount, 'days to database');

    // If no data was synced, return a helpful message
    if (syncedCount === 0) {
      return jsonResponse({
        success: true,
        data: {
          message: 'No fitness data found in Google Fit for the last 30 days. Make sure you have Google Fit installed and have been recording activities.',
          syncedDays: 0,
          hint: 'Try recording some steps or activities in Google Fit first.',
        },
      });
    }

    return jsonResponse({
      success: true,
      data: {
        message: `Successfully synced ${syncedCount} days of health data`,
        syncedDays: syncedCount,
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Failed to sync data',
    });
  }
}
