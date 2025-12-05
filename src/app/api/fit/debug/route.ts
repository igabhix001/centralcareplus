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
      return jsonResponse({ success: false, message: 'Patient not found' });
    }

    // Check token
    const token = await prisma.googleFitToken.findUnique({
      where: { patientId: patient.id },
    });

    // Get data
    const data = await prisma.googleFitData.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' },
      take: 10,
    });

    return jsonResponse({
      success: true,
      debug: {
        patientId: patient.id,
        hasToken: !!token,
        tokenExpired: token ? token.expiresAt < new Date() : null,
        dataCount: data.length,
        latestData: data[0] || null,
        allData: data,
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return errorResponse('Debug failed', 500);
  }
}
