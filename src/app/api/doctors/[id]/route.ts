import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, getAuthUser, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/doctors/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const doctor = await prisma.doctor.findUnique({
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

    if (!doctor) {
      return errorResponse('Doctor not found', 404);
    }

    return jsonResponse({ success: true, data: doctor });
  } catch (error) {
    console.error('Get doctor error:', error);
    return errorResponse('Failed to get doctor', 500);
  }
}

// PUT /api/doctors/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = params;
    const body = await request.json();

    // Get existing doctor
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingDoctor) {
      return errorResponse('Doctor not found', 404);
    }

    // Doctors can only update their own data
    if (authUser.role === 'DOCTOR' && existingDoctor.userId !== authUser.userId) {
      return errorResponse('Forbidden', 403);
    }

    // Non-doctors need SUPERADMIN or STAFF role
    if (authUser.role !== 'DOCTOR' && !['SUPERADMIN', 'STAFF'].includes(authUser.role)) {
      return errorResponse('Forbidden', 403);
    }

    const { firstName, lastName, phone, ...doctorData } = body;

    // Update user fields if provided
    if (firstName || lastName || phone) {
      await prisma.user.update({
        where: { id: existingDoctor.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone && { phone }),
        },
      });
    }

    // Update doctor fields
    const doctor = await prisma.doctor.update({
      where: { id },
      data: doctorData,
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

    return jsonResponse({ success: true, data: doctor });
  } catch (error: any) {
    console.error('Update doctor error:', error);
    return errorResponse('Failed to update doctor', 500);
  }
}

// DELETE /api/doctors/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'SUPERADMIN');

    const { id } = params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      return errorResponse('Doctor not found', 404);
    }

    // Soft delete - deactivate user
    await prisma.user.update({
      where: { id: doctor.userId },
      data: { isActive: false },
    });

    return jsonResponse({ success: true, message: 'Doctor deleted' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Delete doctor error:', error);
    return errorResponse('Failed to delete doctor', 500);
  }
}
