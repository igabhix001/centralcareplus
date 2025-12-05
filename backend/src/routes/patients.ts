import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const updatePatientSchema = z.object({
  dateOfBirth: z.union([z.string().datetime(), z.string().length(0), z.null()]).optional(),
  gender: z.union([z.enum(['MALE', 'FEMALE', 'OTHER', 'Male', 'Female', 'Other']), z.string().length(0), z.null()]).optional(),
  bloodGroup: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  emergencyContact: z.union([z.string(), z.null()]).optional(),
  emergencyPhone: z.union([z.string(), z.null()]).optional(),
  insuranceId: z.union([z.string(), z.null()]).optional(),
});

// Get all patients (admin/staff only)
router.get('/', authenticate, authorize('SUPERADMIN', 'STAFF', 'DOCTOR'), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = search
      ? {
          OR: [
            { user: { firstName: { contains: search as string, mode: 'insensitive' as const } } },
            { user: { lastName: { contains: search as string, mode: 'insensitive' as const } } },
            { user: { email: { contains: search as string, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to get patients' });
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Patients can only view their own data
    if (req.user!.role === 'PATIENT') {
      const userPatient = await prisma.patient.findUnique({
        where: { userId: req.user!.userId },
      });
      if (userPatient?.id !== id) {
        throw new AppError('Access denied', 403);
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
            isActive: true,
            createdAt: true,
          },
        },
        appointments: {
          take: 5,
          orderBy: { scheduledAt: 'desc' },
          include: {
            doctor: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        medicalRecords: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to get patient' });
  }
});

// Update patient
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updatePatientSchema.parse(req.body);

    // Patients can only update their own data
    if (req.user!.role === 'PATIENT') {
      const userPatient = await prisma.patient.findUnique({
        where: { userId: req.user!.userId },
      });
      if (userPatient?.id !== id) {
        throw new AppError('Access denied', 403);
      }
    }

    // Clean up data - remove empty strings and normalize values
    const cleanData: any = {};
    if (data.dateOfBirth && data.dateOfBirth.length > 0) {
      cleanData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.gender && data.gender.length > 0) {
      cleanData.gender = data.gender.toUpperCase();
    }
    if (data.bloodGroup && data.bloodGroup.length > 0) {
      cleanData.bloodGroup = data.bloodGroup;
    }
    if (data.address && data.address.length > 0) {
      cleanData.address = data.address;
    }
    if (data.emergencyContact && data.emergencyContact.length > 0) {
      cleanData.emergencyContact = data.emergencyContact;
    }
    if (data.emergencyPhone && data.emergencyPhone.length > 0) {
      cleanData.emergencyPhone = data.emergencyPhone;
    }
    if (data.insuranceId && data.insuranceId.length > 0) {
      cleanData.insuranceId = data.insuranceId;
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: cleanData,
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

    res.json({ success: true, data: patient });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Get patient's health data (Google Fit)
router.get('/:id/health', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Patients can only view their own data
    if (req.user!.role === 'PATIENT') {
      const userPatient = await prisma.patient.findUnique({
        where: { userId: req.user!.userId },
      });
      if (userPatient?.id !== id) {
        throw new AppError('Access denied', 403);
      }
    }

    const healthData = await prisma.googleFitData.findMany({
      where: {
        patientId: id,
        date: {
          gte: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lte: endDate ? new Date(endDate as string) : new Date(),
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: healthData });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get health data error:', error);
    res.status(500).json({ error: 'Failed to get health data' });
  }
});

export default router;
