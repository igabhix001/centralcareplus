import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireRole, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/doctors - Get all doctors (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const specialization = searchParams.get('specialization') || '';
    const skip = (page - 1) * limit;

    const where: any = {
      user: { isActive: true },
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { specialization: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (specialization) {
      where.specialization = specialization;
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
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

    return jsonResponse({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    return errorResponse('Failed to get doctors', 500);
  }
}

// POST /api/doctors - Create doctor (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'SUPERADMIN', 'STAFF');

    const body = await request.json();
    const {
      email, password, firstName, lastName, phone,
      specialization, licenseNumber, experience, consultationFee,
      qualification, bio, education, languages,
      availableDays, availableFrom, availableTo, slotDuration,
    } = body;

    if (!email || !password || !firstName || !specialization) {
      return errorResponse('Email, password, first name, and specialization are required', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        phone,
        role: 'DOCTOR',
        doctor: {
          create: {
            specialization,
            licenseNumber: licenseNumber || '',
            experience: experience || 0,
            consultationFee: consultationFee || 500,
            bio,
            education: education || [],
            languages: languages || [],
            availableDays: availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            availableFrom: availableFrom || '09:00',
            availableTo: availableTo || '17:00',
            slotDuration: slotDuration || 30,
          },
        },
      },
      include: {
        doctor: true,
      },
    }) as any;

    return jsonResponse({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        doctor: user.doctor,
      },
    }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Create doctor error:', error);
    return errorResponse('Failed to create doctor', 500);
  }
}
