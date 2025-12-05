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

    const record = await prisma.medicalRecord.findUnique({
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

    if (!record) {
      return errorResponse('Record not found', 404);
    }

    // Patients can only view their own records
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
      });
      if (record.patientId !== patient?.id) {
        return errorResponse('Forbidden', 403);
      }
    }

    return jsonResponse({ success: true, data: record });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get record error:', error);
    return errorResponse('Failed to get record', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;
    const body = await request.json();

    // Only doctors can update records
    if (!['DOCTOR', 'SUPERADMIN', 'STAFF'].includes(authUser.role)) {
      return errorResponse('Forbidden', 403);
    }

    const { diagnosis, symptoms, notes, attachments } = body;

    const record = await prisma.medicalRecord.update({
      where: { id },
      data: {
        ...(diagnosis && { diagnosis }),
        ...(symptoms && { symptoms }),
        ...(notes !== undefined && { notes }),
        ...(attachments && { attachments }),
      },
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

    return jsonResponse({ success: true, data: record });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Update record error:', error);
    return errorResponse('Failed to update record', 500);
  }
}
