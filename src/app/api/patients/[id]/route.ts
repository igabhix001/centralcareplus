import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/patients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;

    // Patients can only view their own data
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { id },
      });
      if (patient?.userId !== authUser.userId) {
        return errorResponse('Forbidden', 403);
      }
    }

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!patient) {
      return errorResponse('Patient not found', 404);
    }

    return jsonResponse({ success: true, data: patient });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get patient error:', error);
    return errorResponse('Failed to get patient', 500);
  }
}

// PUT /api/patients/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;
    const body = await request.json();

    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      return errorResponse('Patient not found', 404);
    }

    // Patients can only update their own data
    if (authUser.role === 'PATIENT' && existingPatient.userId !== authUser.userId) {
      return errorResponse('Forbidden', 403);
    }

    const { firstName, lastName, phone, ...patientData } = body;

    // Update user fields if provided
    if (firstName || lastName || phone) {
      await prisma.user.update({
        where: { id: existingPatient.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone && { phone }),
        },
      });
    }

    // Update patient fields
    const patient = await prisma.patient.update({
      where: { id },
      data: patientData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return jsonResponse({ success: true, data: patient });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Update patient error:', error);
    return errorResponse('Failed to update patient', 500);
  }
}

// DELETE /api/patients/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'SUPERADMIN');

    const { id } = params;

    const patient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return errorResponse('Patient not found', 404);
    }

    // Soft delete
    await prisma.user.update({
      where: { id: patient.userId },
      data: { isActive: false },
    });

    return jsonResponse({ success: true, message: 'Patient deleted' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Delete patient error:', error);
    return errorResponse('Failed to delete patient', 500);
  }
}
