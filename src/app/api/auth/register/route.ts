import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken, jsonResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, dateOfBirth, gender, bloodGroup, address, emergencyContact } = body;

    if (!email || !password || !firstName) {
      return errorResponse('Email, password, and first name are required', 400);
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
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
        role: 'PATIENT',
        patient: {
          create: {
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
            gender,
            bloodGroup,
            address,
            emergencyContact,
          },
        },
      },
      include: {
        patient: true,
      },
    }) as any;

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return jsonResponse({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          patientId: user.patient?.id,
        },
        token,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}
