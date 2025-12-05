import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

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
      return errorResponse('Google Fit not connected', 400);
    }

    // Check if token needs refresh
    let accessToken = fitToken.accessToken;
    if (fitToken.expiresAt < new Date()) {
      if (!fitToken.refreshToken) {
        return errorResponse('Token expired and no refresh token available', 400);
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

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token refresh failed:', errorData);
        return errorResponse('Failed to refresh token', 400);
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;

      // Update token in database
      await prisma.googleFitToken.update({
        where: { patientId: patient.id },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    }

    // Fetch data from Google Fit
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Fetch steps
    const stepsResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
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
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime.getTime(),
          endTimeMillis: endTime.getTime(),
        }),
      }
    );

    // Fetch calories
    const caloriesResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
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

    // Fetch heart rate
    const heartRateResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
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

    const [stepsData, caloriesData, heartRateData] = await Promise.all([
      stepsResponse.json(),
      caloriesResponse.json(),
      heartRateResponse.json(),
    ]);

    // Check for errors
    if (stepsData.error) {
      console.error('Steps API error:', stepsData.error);
      return errorResponse(`Google Fit API error: ${stepsData.error.message}`, 400);
    }

    // Process data
    const dataByDate: { [key: string]: any } = {};

    // Process steps
    stepsData.bucket?.forEach((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const steps = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      if (!dataByDate[date]) dataByDate[date] = {};
      dataByDate[date].steps = steps;
    });

    // Process calories
    caloriesData.bucket?.forEach((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const calories = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;
      if (!dataByDate[date]) dataByDate[date] = {};
      dataByDate[date].calories = Math.round(calories);
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

    // Store in database
    let syncedCount = 0;
    for (const [date, data] of Object.entries(dataByDate)) {
      await prisma.googleFitData.upsert({
        where: {
          patientId_date: {
            patientId: patient.id,
            date: new Date(date),
          },
        },
        update: {
          steps: data.steps || 0,
          heartRate: data.heartRate || null,
          calories: data.calories || 0,
        },
        create: {
          patientId: patient.id,
          date: new Date(date),
          steps: data.steps || 0,
          heartRate: data.heartRate || null,
          calories: data.calories || 0,
        },
      });
      syncedCount++;
    }

    return jsonResponse({
      success: true,
      data: {
        message: `Synced ${syncedCount} days of health data`,
        syncedDays: syncedCount,
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return errorResponse(error.message || 'Failed to sync data', 500);
  }
}
