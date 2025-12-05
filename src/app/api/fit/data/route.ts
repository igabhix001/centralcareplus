import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { userId: authUser.userId },
    });

    if (!patient) {
      return jsonResponse({ 
        success: true, 
        data: { connected: false, data: [], message: 'Patient not found' } 
      });
    }

    // Check if user has connected Google Fit
    let fitToken = null;
    try {
      fitToken = await prisma.googleFitToken.findUnique({
        where: { patientId: patient.id },
      });
    } catch (e) {
      console.log('GoogleFitToken table may not exist yet');
    }

    if (!fitToken) {
      return jsonResponse({ 
        success: true, 
        data: { connected: false, data: [], message: 'Not connected to Google Fit' } 
      });
    }

    // Get Google Fit data for this patient
    let fitData: any[] = [];
    try {
      fitData = await prisma.googleFitData.findMany({
        where: { patientId: patient.id },
        orderBy: { date: 'desc' },
        take: 30, // Last 30 days
      });
    } catch (e) {
      console.log('GoogleFitData table may not exist yet');
    }

    // If no data or token expired, try to refresh and fetch new data
    if (fitData.length === 0 || fitToken.expiresAt < new Date()) {
      try {
        await refreshTokenAndFetchData(patient.id, fitToken);
        // Refetch data after sync
        fitData = await prisma.googleFitData.findMany({
          where: { patientId: patient.id },
          orderBy: { date: 'desc' },
          take: 30,
        });
      } catch (error: any) {
        console.error('Failed to refresh Google Fit data:', error);
        return jsonResponse({ 
          success: true, 
          data: { 
            connected: true, 
            data: [], 
            error: error.message || 'Failed to sync data from Google Fit'
          } 
        });
      }
    }

    return jsonResponse({ 
      success: true, 
      data: { connected: true, data: fitData } 
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get fit data error:', error);
    return jsonResponse({ 
      success: false, 
      data: { connected: false, data: [], error: error.message } 
    });
  }
}

async function refreshTokenAndFetchData(patientId: string, fitToken: any) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!fitToken.refreshToken) {
    throw new Error('No refresh token available');
  }

  // Refresh the access token
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
    throw new Error('Failed to refresh token');
  }

  const tokens = await tokenResponse.json();

  // Update token in database
  await prisma.googleFitToken.update({
    where: { patientId },
    data: {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  // Fetch new data with refreshed token
  await fetchAndStoreGoogleFitData(patientId, tokens.access_token);
}

async function fetchAndStoreGoogleFitData(patientId: string, accessToken: string) {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

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

    const [stepsData, caloriesData] = await Promise.all([
      stepsResponse.json(),
      caloriesResponse.json(),
    ]);

    // Process and store data
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
          calories: data.calories || 0,
        },
        create: {
          patientId,
          date: new Date(date),
          steps: data.steps || 0,
          calories: data.calories || 0,
        },
      });
    }
  } catch (error) {
    console.error('Failed to fetch Google Fit data:', error);
  }
}

// No mock data - real Google Fit data only
