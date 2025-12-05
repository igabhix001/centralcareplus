import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireRole, jsonResponse, errorResponse } from '@/lib/auth';

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
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return jsonResponse({
      success: true,
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get billing error:', error);
    return errorResponse('Failed to get billing', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'SUPERADMIN', 'STAFF');
    const body = await request.json();

    const { patientId, appointmentId, items, totalAmount, dueDate, notes } = body;

    if (!patientId || !totalAmount) {
      return errorResponse('Patient and total amount are required', 400);
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const subtotal = totalAmount;
    const tax = 0;
    const discount = 0;
    const total = subtotal + tax - discount;

    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        appointmentId,
        invoiceNumber,
        items: items || [],
        subtotal,
        tax,
        discount,
        total,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes,
        status: 'PENDING',
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return jsonResponse({ success: true, data: invoice }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Create invoice error:', error);
    return errorResponse('Failed to create invoice', 500);
  }
}
