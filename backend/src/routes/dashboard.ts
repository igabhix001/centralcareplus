import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Admin dashboard stats
router.get('/admin', authenticate, authorize('SUPERADMIN', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalPatients,
      totalDoctors,
      todayAppointments,
      totalAppointments,
      monthlyAppointments,
      lastMonthAppointments,
      recentAppointments,
      topDoctors,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.appointment.count({
        where: { scheduledAt: { gte: today, lt: tomorrow } },
      }),
      prisma.appointment.count(),
      prisma.appointment.count({
        where: { scheduledAt: { gte: startOfMonth } },
      }),
      prisma.appointment.count({
        where: { scheduledAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.appointment.findMany({
        take: 5,
        orderBy: { scheduledAt: 'desc' },
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true } } } },
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.doctor.findMany({
        take: 5,
        orderBy: { rating: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
      }),
    ]);

    // Calculate trends
    const appointmentTrend = lastMonthAppointments > 0
      ? Math.round(((monthlyAppointments - lastMonthAppointments) / lastMonthAppointments) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalDoctors,
          todayAppointments,
          totalAppointments,
          monthlyAppointments,
          appointmentTrend,
        },
        recentAppointments,
        topDoctors,
      },
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Doctor dashboard stats
router.get('/doctor', authenticate, authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) throw new AppError('Doctor not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayAppointments,
      totalPatients,
      completedToday,
      pendingReviews,
      upcomingAppointments,
      recentPatients,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          scheduledAt: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: { doctorId: doctor.id },
        _count: true,
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          scheduledAt: { gte: today, lt: tomorrow },
          status: 'COMPLETED',
        },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          status: 'COMPLETED',
          medicalRecord: null,
        },
      }),
      prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          scheduledAt: { gte: today },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        },
        take: 10,
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true, avatar: true } } } },
        },
      }),
      prisma.medicalRecord.findMany({
        where: { doctorId: doctor.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        distinct: ['patientId'],
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          todayAppointments,
          totalPatients: totalPatients.length,
          completedToday,
          pendingReviews,
        },
        upcomingAppointments,
        recentPatients: recentPatients.map((r: any) => ({
          id: r.patient.id,
          name: `${r.patient.user.firstName} ${r.patient.user.lastName}`,
          lastVisit: r.createdAt,
          diagnosis: r.diagnosis,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get doctor dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Patient dashboard stats
router.get('/patient', authenticate, authorize('PATIENT'), async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
    if (!patient) throw new AppError('Patient not found', 404);

    const today = new Date();

    const [
      upcomingAppointments,
      recentRecords,
      activePrescriptions,
      healthData,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          scheduledAt: { gte: today },
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        },
        take: 5,
        orderBy: { scheduledAt: 'asc' },
        include: {
          doctor: {
            include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
          },
        },
      }),
      prisma.medicalRecord.findMany({
        where: { patientId: patient.id },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.prescription.findMany({
        where: {
          patientId: patient.id,
          validUntil: { gte: today },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.googleFitData.findFirst({
        where: { patientId: patient.id },
        orderBy: { date: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        upcomingAppointments,
        recentRecords,
        activePrescriptions,
        healthData,
        googleFitConnected: patient.googleFitConnected,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get patient dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
