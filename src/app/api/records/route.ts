import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/records
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by role
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

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          doctor: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    return jsonResponse({
      success: true,
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get records error:', error);
    return errorResponse('Failed to get records', 500);
  }
}

// POST /api/records
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'DOCTOR', 'SUPERADMIN', 'STAFF');
    const body = await request.json();

    const { patientId, doctorId, diagnosis, symptoms, treatment, notes, attachments } = body;

    if (!patientId || !doctorId || !diagnosis) {
      return errorResponse('Patient, doctor, and diagnosis are required', 400);
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId,
        doctorId,
        diagnosis,
        symptoms: symptoms || [],
        notes,
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

    return jsonResponse({ success: true, data: record }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Create record error:', error);
    return errorResponse('Failed to create record', 500);
  }
}
