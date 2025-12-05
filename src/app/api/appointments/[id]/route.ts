import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// GET /api/appointments/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const { id } = params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      return errorResponse('Appointment not found', 404);
    }

    return jsonResponse({ success: true, data: appointment });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get appointment error:', error);
    return errorResponse('Failed to get appointment', 500);
  }
}

// PUT /api/appointments/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const { id } = params;
    const body = await request.json();

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return errorResponse('Appointment not found', 404);
    }

    const { scheduledAt, status, type, notes } = body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(status && { status }),
        ...(type && { type }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        patient: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return jsonResponse({ success: true, data: appointment });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Update appointment error:', error);
    return errorResponse('Failed to update appointment', 500);
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const { id } = params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!appointment) {
      return errorResponse('Appointment not found', 404);
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Send cancellation notifications
    const formattedDate = appointment.scheduledAt.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Notify patient
    await createNotification(
      appointment.patient.user.id,
      'Appointment Cancelled',
      `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} on ${formattedDate} has been cancelled`,
      'APPOINTMENT_CANCELLED',
      `/patient/appointments`
    );

    // Notify doctor
    await createNotification(
      appointment.doctor.user.id,
      'Appointment Cancelled',
      `Appointment with ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} on ${formattedDate} has been cancelled`,
      'APPOINTMENT_CANCELLED',
      `/doctor/appointments`
    );

    return jsonResponse({ success: true, message: 'Appointment cancelled' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Delete appointment error:', error);
    return errorResponse('Failed to cancel appointment', 500);
  }
}
