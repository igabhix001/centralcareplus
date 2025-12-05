import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireRole, jsonResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'SUPERADMIN');

    const body = await request.json();
    const { email, password, firstName, lastName, phone, role } = body;

    if (!email || !password || !firstName || !role) {
      return errorResponse('Email, password, first name, and role are required', 400);
    }

    if (!['STAFF', 'SUPERADMIN'].includes(role)) {
      return errorResponse('Invalid role', 400);
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
        role,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Create staff error:', error);
    return errorResponse('Failed to create staff user', 500);
  }
}
