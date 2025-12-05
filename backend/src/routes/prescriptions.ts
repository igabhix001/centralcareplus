import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  notes: z.string().optional(),
});

const createPrescriptionSchema = z.object({
  patientId: z.string(),
  recordId: z.string().optional(),
  medications: z.array(medicationSchema).min(1),
  instructions: z.string().optional(),
  validUntil: z.string().datetime(),
});

const updatePrescriptionSchema = z.object({
  medications: z.array(medicationSchema).optional(),
  instructions: z.string().optional(),
  validUntil: z.string().datetime().optional(),
});

// Get prescriptions
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', patientId, status } = req.query;
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

    // Filter by active/expired
    if (status === 'active') {
      where.validUntil = { gte: new Date() };
    } else if (status === 'expired') {
      where.validUntil = { lt: new Date() };
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ]);

    res.json({
      success: true,
      data: prescriptions,
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
    console.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Failed to get prescriptions' });
  }
});

// Get prescription by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        record: true,
      },
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    // Access control
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (prescription.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get prescription error:', error);
    res.status(500).json({ error: 'Failed to get prescription' });
  }
});

// Create prescription (doctors only)
router.post('/', authenticate, authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const data = createPrescriptionSchema.parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (!doctor) throw new AppError('Doctor not found', 404);

    const prescription = await prisma.prescription.create({
      data: {
        patientId: data.patientId,
        doctorId: doctor.id,
        recordId: data.recordId,
        medications: data.medications,
        instructions: data.instructions,
        validUntil: new Date(data.validUntil),
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

    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create prescription error:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// Update prescription
router.put('/:id', authenticate, authorize('DOCTOR'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updatePrescriptionSchema.parse(req.body);

    const existing = await prisma.prescription.findUnique({ where: { id } });
    if (!existing) throw new AppError('Prescription not found', 404);

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });
    if (existing.doctorId !== doctor?.id) {
      throw new AppError('Access denied', 403);
    }

    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
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

    res.json({ success: true, data: prescription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update prescription error:', error);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

export default router;
