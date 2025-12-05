import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, jsonResponse, errorResponse } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'SUPERADMIN', 'STAFF');
    const { id } = params;
    const body = await request.json();
    const { status, paymentMethod } = body;

    if (!status) {
      return errorResponse('Status is required', 400);
    }

    const updateData: any = { status };
    
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return jsonResponse({ success: true, data: invoice });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Update invoice status error:', error);
    return errorResponse('Failed to update invoice status', 500);
  }
}
