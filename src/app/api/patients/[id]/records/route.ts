import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;

    // Patients can only view their own records
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { id },
      });
      if (patient?.userId !== authUser.userId) {
        return errorResponse('Forbidden', 403);
      }
    }

    const records = await prisma.medicalRecord.findMany({
      where: { patientId: id },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse({ success: true, data: records });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get patient records error:', error);
    return errorResponse('Failed to get records', 500);
  }
}
