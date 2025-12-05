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

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!prescription) {
      return errorResponse('Prescription not found', 404);
    }

    // Patients can only view their own prescriptions
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
      });
      if (prescription.patientId !== patient?.id) {
        return errorResponse('Forbidden', 403);
      }
    }

    return jsonResponse({ success: true, data: prescription });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get prescription error:', error);
    return errorResponse('Failed to get prescription', 500);
  }
}
