import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return jsonResponse({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        patientId: user.patient?.id,
        doctorId: user.doctor?.id,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get user error:', error);
    return errorResponse('Failed to get user', 500);
  }
}
