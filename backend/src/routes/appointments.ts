import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createNotification } from './notifications.js';

const router = Router();

const createAppointmentSchema = z.object({
  doctorId: z.string(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(15).max(120).optional(),
  type: z.enum(['checkup', 'followup', 'consultation', 'emergency']),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
});

const updateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
});

// Get appointments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, startDate, endDate, doctorId, patientId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    // Role-based filtering
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError('Patient not found', 404);
      where.patientId = patient.id;
    } else if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError('Doctor not found', 404);
      where.doctorId = doctor.id;
    } else {
      // Admin/Staff can filter
      if (doctorId) where.doctorId = doctorId;
      if (patientId) where.patientId = patientId;
    }

    if (status) {
      const statusStr = status as string;
      if (statusStr.includes(',')) {
        where.status = { in: statusStr.split(',').map(s => s.trim()) };
      } else {
        where.status = statusStr;
      }
    }
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate as string);
      if (endDate) where.scheduledAt.lte = new Date(endDate as string);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
            },
          },
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Get today's appointments (for doctor dashboard)
router.get('/today', authenticate, authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) throw new AppError('Doctor not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get today appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Get appointment by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true, avatar: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, avatar: true } },
          },
        },
        medicalRecord: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Access control
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (appointment.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
    } else if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (appointment.doctorId !== doctor?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Failed to get appointment' });
  }
});

// Create appointment
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createAppointmentSchema.parse(req.body);

    let patientId: string;

    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError('Patient not found', 404);
      patientId = patient.id;
    } else {
      // Admin/Staff booking for a patient
      const { patientId: pid } = req.body;
      if (!pid) throw new AppError('Patient ID required', 400);
      patientId = pid;
    }

    // Check doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) throw new AppError('Doctor not found', 404);

    // Check slot availability
    const scheduledAt = new Date(data.scheduledAt);
    const duration = data.duration || doctor.slotDuration;

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - duration * 60 * 1000),
          lt: new Date(scheduledAt.getTime() + duration * 60 * 1000),
        },
      },
    });

    if (conflictingAppointment) {
      throw new AppError('This time slot is not available', 409);
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: data.doctorId,
        scheduledAt,
        duration,
        type: data.type,
        symptoms: data.symptoms,
        notes: data.notes,
        status: 'SCHEDULED',
      },
      include: {
        patient: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        doctor: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    // Send notifications
    const formattedDate = scheduledAt.toLocaleDateString('en-IN', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    
    // Notify patient
    await createNotification(
      appointment.patient.user.id,
      'Appointment Scheduled',
      `Your appointment with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} is scheduled for ${formattedDate}`,
      'APPOINTMENT_CONFIRMED',
      `/patient/appointments/${appointment.id}`
    );

    // Notify doctor
    await createNotification(
      appointment.doctor.user.id,
      'New Appointment',
      `New ${data.type} appointment with ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} on ${formattedDate}`,
      'APPOINTMENT_CONFIRMED',
      `/doctor/appointments/${appointment.id}`
    );

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAppointmentSchema.parse(req.body);

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Appointment not found', 404);

    // Access control
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (existing.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
      // Patients can only cancel
      if (data.status && data.status !== 'CANCELLED') {
        throw new AppError('Patients can only cancel appointments', 403);
      }
    } else if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (existing.doctorId !== doctor?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    res.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Appointment not found', 404);

    // Access control
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (existing.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router;
