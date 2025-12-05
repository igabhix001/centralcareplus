import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// GET /api/appointments
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctorId = searchParams.get('doctorId');
    const patientIdParam = searchParams.get('patientId');
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by role
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
      });
      if (patient) {
        where.patientId = patient.id;
      }
    } else if (authUser.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: authUser.userId },
      });
      if (doctor) {
        where.doctorId = doctor.id;
      }
    }

    // Admin/Staff can filter by doctorId and patientId
    if (['SUPERADMIN', 'STAFF'].includes(authUser.role)) {
      if (doctorId) where.doctorId = doctorId;
      if (patientIdParam) where.patientId = patientIdParam;
    }

    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }

    // Date filtering
    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dateStart, lte: dateEnd };
    } else if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.appointment.count({ where }),
    ]);

    return jsonResponse({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get appointments error:', error);
    return errorResponse('Failed to get appointments', 500);
  }
}

// POST /api/appointments
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();

    const { patientId, doctorId, scheduledAt, type, notes } = body;

    if (!patientId || !doctorId || !scheduledAt) {
      return errorResponse('Patient, doctor, and scheduled time are required', 400);
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return errorResponse('Doctor not found', 404);
    }

    // Check for conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduledAt: new Date(scheduledAt),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });

    if (conflictingAppointment) {
      return errorResponse('This time slot is already booked', 409);
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        scheduledAt: new Date(scheduledAt),
        type: type || 'CONSULTATION',
        notes,
        status: 'SCHEDULED',
      },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Send notifications
    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Notify patient
    await createNotification(
      appointment.patient.user.id,
      'Appointment Scheduled',
      `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} is scheduled for ${formattedDate}`,
      'APPOINTMENT_CONFIRMED',
      `/patient/appointments`
    );

    // Notify doctor
    await createNotification(
      appointment.doctor.user.id,
      'New Appointment',
      `New ${type || 'consultation'} appointment with ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} on ${formattedDate}`,
      'APPOINTMENT_CONFIRMED',
      `/doctor/appointments`
    );

    return jsonResponse({ success: true, data: appointment }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Create appointment error:', error);
    return errorResponse('Failed to create appointment', 500);
  }
}
