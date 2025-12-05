import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  phone: z.string().optional(),
  specialization: z.string(),
  licenseNumber: z.string().optional().default(''),
  experience: z.number().int().min(0).optional().default(0),
  consultationFee: z.number().min(0).optional().default(500),
  qualification: z.string().optional(),
  bio: z.string().optional(),
  education: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availableDays: z.array(z.string()).optional().default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
  availableFrom: z.string().optional().default('09:00'),
  availableTo: z.string().optional().default('17:00'),
  slotDuration: z.number().int().min(15).max(120).optional().default(30),
});

const updateDoctorSchema = z.object({
  // User fields
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  // Doctor fields
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  consultationFee: z.number().min(0).optional(),
  qualification: z.string().optional(),
  bio: z.string().optional(),
  education: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  slotDuration: z.number().int().min(15).max(120).optional(),
  isAvailable: z.boolean().optional(),
});

// Get all doctors (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', search = '', specialization = '' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      user: { isActive: true },
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { specialization: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (specialization) {
      where.specialization = specialization;
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
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
            },
          },
        },
        orderBy: { rating: 'desc' },
      }),
      prisma.doctor.count({ where }),
    ]);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Failed to get doctors' });
  }
});

// Get doctor by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
      throw new AppError('Doctor not found', 404);
    }

    res.json({ success: true, data: doctor });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get doctor error:', error);
    res.status(500).json({ error: 'Failed to get doctor' });
  }
});

// Create doctor (admin only)
router.post('/', authenticate, authorize('SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const data = createDoctorSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'DOCTOR',
        doctor: {
          create: {
            specialization: data.specialization,
            licenseNumber: data.licenseNumber,
            experience: data.experience,
            consultationFee: data.consultationFee,
            bio: data.bio,
            education: data.education || [],
            languages: data.languages || [],
            availableDays: data.availableDays,
            availableFrom: data.availableFrom,
            availableTo: data.availableTo,
            slotDuration: data.slotDuration || 30,
          },
        },
      },
      include: {
        doctor: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        doctor: user.doctor,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create doctor error:', error);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
});

// Update doctor
router.put('/:id', authenticate, authorize('SUPERADMIN', 'STAFF', 'DOCTOR'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateDoctorSchema.parse(req.body);

    // Get existing doctor to find userId
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingDoctor) {
      throw new AppError('Doctor not found', 404);
    }

    // Doctors can only update their own data
    if (req.user!.role === 'DOCTOR') {
      if (existingDoctor.userId !== req.user!.userId) {
        throw new AppError('Access denied', 403);
      }
    }

    // Separate user fields from doctor fields
    const { firstName, lastName, phone, ...doctorData } = data;
    const userUpdateData: any = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (phone !== undefined) userUpdateData.phone = phone;

    // Update user if there are user fields to update
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: existingDoctor.userId },
        data: userUpdateData,
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

    res.json({ success: true, data: doctor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update doctor error:', error);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
});

// Get doctor's available slots
router.get('/:id/slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      throw new AppError('Date is required', 400);
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const selectedDate = new Date(date as string);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (!doctor.availableDays.includes(dayOfWeek)) {
      return res.json({ success: true, data: [] });
    }

    // Get existing appointments for the date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { scheduledAt: true, duration: true },
    });

    // Generate available slots
    const slots: string[] = [];
    const [fromHour, fromMin] = doctor.availableFrom.split(':').map(Number);
    const [toHour, toMin] = doctor.availableTo.split(':').map(Number);
    
    let currentTime = fromHour * 60 + fromMin;
    const endTime = toHour * 60 + toMin;

    while (currentTime + doctor.slotDuration <= endTime) {
      const slotHour = Math.floor(currentTime / 60);
      const slotMin = currentTime % 60;
      const slotTime = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

      // Check if slot is booked
      const slotDate = new Date(selectedDate);
      slotDate.setHours(slotHour, slotMin, 0, 0);

      const isBooked = bookedAppointments.some((apt: { scheduledAt: Date; duration: number }) => {
        const aptTime = new Date(apt.scheduledAt).getTime();
        const slotStartTime = slotDate.getTime();
        const slotEndTime = slotStartTime + doctor.slotDuration * 60 * 1000;
        const aptEndTime = aptTime + apt.duration * 60 * 1000;
        return (aptTime < slotEndTime && aptEndTime > slotStartTime);
      });

      if (!isBooked) {
        slots.push(slotTime);
      }

      currentTime += doctor.slotDuration;
    }

    res.json({ success: true, data: slots });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to get slots' });
  }
});

// Get specializations
router.get('/meta/specializations', async (_req: Request, res: Response) => {
  try {
    const specializations = await prisma.doctor.findMany({
      select: { specialization: true },
      distinct: ['specialization'],
    });

    res.json({
      success: true,
      data: specializations.filter((s: { specialization: string }) => s.specialization),
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ error: 'Failed to get specializations' });
  }
});

export default router;
