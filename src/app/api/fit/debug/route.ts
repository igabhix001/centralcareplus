import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// Debug endpoint to check Google Fit integration status
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const patient = await prisma.patient.findUnique({
      where: { userId: authUser.userId },
    });

    if (!patient) {
      return jsonResponse({ 
        success: false, 
        error: 'Patient not found',
        userId: authUser.userId
      });
    }

    // Get token
    let fitToken = null;
    try {
      fitToken = await prisma.googleFitToken.findUnique({
        where: { patientId: patient.id },
      });
    } catch (e: any) {
      return jsonResponse({ 
        success: false, 
        error: 'GoogleFitToken table error: ' + e.message 
      });
    }

    if (!fitToken) {
      return jsonResponse({ 
        success: false, 
        error: 'No Google Fit token found',
        patientId: patient.id
      });
    }

    // Get stored data count
    let dataCount = 0;
    let sampleData: any[] = [];
    try {
      dataCount = await prisma.googleFitData.count({
        where: { patientId: patient.id },
      });
      sampleData = await prisma.googleFitData.findMany({
        where: { patientId: patient.id },
        take: 5,
        orderBy: { date: 'desc' },
      });
    } catch (e: any) {
      return jsonResponse({ 
        success: false, 
        error: 'GoogleFitData table error: ' + e.message 
      });
    }

    // Test Google Fit API directly
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

    let apiResponse = null;
    let apiError = null;

    try {
      const response = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${fitToken.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aggregateBy: [
              { dataTypeName: 'com.google.step_count.delta' },
            ],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: startTime.getTime(),
            endTimeMillis: endTime.getTime(),
          }),
        }
      );

      apiResponse = await response.json();
    } catch (e: any) {
      apiError = e.message;
    }

    return jsonResponse({
      success: true,
      debug: {
        patientId: patient.id,
        hasToken: !!fitToken,
        tokenExpired: fitToken.expiresAt < new Date(),
        tokenExpiresAt: fitToken.expiresAt,
        storedDataCount: dataCount,
        sampleStoredData: sampleData,
        googleFitApiResponse: apiResponse,
        googleFitApiError: apiError,
      }
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Debug failed', 500);
  }
}
