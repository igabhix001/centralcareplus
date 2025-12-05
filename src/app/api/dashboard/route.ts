import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/dashboard
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'admin';

    if (type === 'admin' && ['SUPERADMIN', 'STAFF'].includes(authUser.role)) {
      return getAdminDashboard();
    } else if (type === 'doctor' && authUser.role === 'DOCTOR') {
      return getDoctorDashboard(authUser.userId);
    } else if (type === 'patient' && authUser.role === 'PATIENT') {
      return getPatientDashboard(authUser.userId);
    }

    return errorResponse('Invalid dashboard type', 400);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Dashboard error:', error);
    return errorResponse('Failed to get dashboard', 500);
  }
}

async function getAdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    totalDoctors,
    totalAppointments,
    todayAppointments,
    pendingAppointments,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.appointment.count({
      where: { status: 'SCHEDULED' },
    }),
  ]);

  // Calculate monthly revenue (simplified)
  const monthlyRevenue = totalAppointments * 500;

  return jsonResponse({
    success: true,
    data: {
      totalPatients,
      totalDoctors,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      monthlyRevenue,
    },
  });
}

async function getDoctorDashboard(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
  });

  if (!doctor) {
    return errorResponse('Doctor not found', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    recentPatients,
  ] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['patientId'],
      where: { doctorId: doctor.id },
    }).then(r => r.length),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: 'COMPLETED',
      },
    }),
    prisma.patient.findMany({
      where: {
        appointments: {
          some: { doctorId: doctor.id },
        },
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return jsonResponse({
    success: true,
    data: {
      totalPatients,
      todayAppointments,
      pendingAppointments,
      completedAppointments,
      recentPatients,
    },
  });
}

async function getPatientDashboard(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    return errorResponse('Patient not found', 404);
  }

  const [
    upcomingAppointments,
    totalRecords,
    totalPrescriptions,
    recentAppointment,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        patientId: patient.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
    }),
    prisma.medicalRecord.count({
      where: { patientId: patient.id },
    }),
    prisma.prescription.count({
      where: { patientId: patient.id },
    }),
    prisma.appointment.findFirst({
      where: { patientId: patient.id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  return jsonResponse({
    success: true,
    data: {
      upcomingAppointments,
      totalRecords,
      totalPrescriptions,
      recentAppointment,
    },
  });
}
