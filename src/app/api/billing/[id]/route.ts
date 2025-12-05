import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!invoice) {
      return errorResponse('Invoice not found', 404);
    }

    // Patients can only view their own invoices
    if (authUser.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.userId },
      });
      if (invoice.patientId !== patient?.id) {
        return errorResponse('Forbidden', 403);
      }
    }

    return jsonResponse({ success: true, data: invoice });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get invoice error:', error);
    return errorResponse('Failed to get invoice', 500);
  }
}
