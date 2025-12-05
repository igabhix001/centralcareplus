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
        data: { connected: false, data: [] } 
      });
    }

    // Get Google Fit data for this patient
    const fitData = await prisma.googleFitData.findMany({
      where: { patientId: patient.id },
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });

    if (fitData.length === 0) {
      // Return mock data for demo purposes
      const mockData = generateMockHealthData();
      return jsonResponse({ 
        success: true, 
        data: { connected: false, data: mockData } 
      });
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
    return errorResponse('Failed to get health data', 500);
  }
}

function generateMockHealthData() {
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      steps: Math.floor(Math.random() * 8000) + 4000,
      heartRate: Math.floor(Math.random() * 30) + 60,
      calories: Math.floor(Math.random() * 500) + 1500,
      sleepHours: Math.round((Math.random() * 3 + 5) * 10) / 10,
      distance: Math.round((Math.random() * 5 + 2) * 100) / 100,
    });
  }
  
  return data;
}
