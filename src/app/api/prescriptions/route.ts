import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/prescriptions
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
      });
      if (patient) {
        where.patientId = patient.id;
      }
    } else if (authUser.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: authUser.userId },
      });
      if (doctor) {
        where.doctorId = doctor.id;
      }
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ]);

    return jsonResponse({
      success: true,
      data: prescriptions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get prescriptions error:', error);
    return errorResponse('Failed to get prescriptions', 500);
  }
}

// POST /api/prescriptions
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'DOCTOR');
    const body = await request.json();

    const { patientId, doctorId, medications, instructions, validUntil, recordId } = body;

    if (!patientId || !doctorId || !medications || !validUntil) {
      return errorResponse('Patient, doctor, medications, and valid until are required', 400);
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        medications,
        instructions,
        validUntil: new Date(validUntil),
        ...(recordId && { recordId }),
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return jsonResponse({ success: true, data: prescription }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Create prescription error:', error);
    return errorResponse('Failed to create prescription', 500);
  }
}
