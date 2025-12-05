import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createRecordSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  diagnosis: z.string(),
  symptoms: z.array(z.string()),
  notes: z.string().optional(),
  vitals: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.number().int().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    oxygenLevel: z.number().int().optional(),
  }).optional(),
});

const updateRecordSchema = createRecordSchema.partial().omit({ patientId: true });

// Get medical records
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', patientId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError('Patient not found', 404);
      where.patientId = patient.id;
    } else if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError('Doctor not found', 404);
      where.doctorId = doctor.id;
      if (patientId) where.patientId = patientId;
    } else {
      if (patientId) where.patientId = patientId;
    }

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          patient: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          doctor: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          attachments: true,
          prescription: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    res.json({
      success: true,
      data: records,
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
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to get records' });
  }
});

// Get record by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        appointment: true,
        attachments: true,
        prescription: true,
      },
    });

    if (!record) {
      throw new AppError('Record not found', 404);
    }

    // Access control
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (record.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get record error:', error);
    res.status(500).json({ error: 'Failed to get record' });
  }
});

// Create medical record (doctors only)
router.post('/', authenticate, authorize('DOCTOR', 'SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const data = createRecordSchema.parse(req.body);

    let doctorId: string;
    if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (!doctor) throw new AppError('Doctor not found', 404);
      doctorId = doctor.id;
    } else {
      const { doctorId: did } = req.body;
      if (!did) throw new AppError('Doctor ID required', 400);
      doctorId = did;
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: data.patientId,
        doctorId,
        appointmentId: data.appointmentId,
        diagnosis: data.diagnosis,
        symptoms: data.symptoms,
        notes: data.notes,
        vitals: data.vitals,
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

    // Update appointment status if linked
    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create record error:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update medical record
router.put('/:id', authenticate, authorize('DOCTOR', 'SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateRecordSchema.parse(req.body);

    const existing = await prisma.medicalRecord.findUnique({ where: { id } });
    if (!existing) throw new AppError('Record not found', 404);

    // Doctors can only update their own records
    if (req.user!.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
      if (existing.doctorId !== doctor?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    const record = await prisma.medicalRecord.update({
      where: { id },
      data,
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    res.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update record error:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

export default router;
