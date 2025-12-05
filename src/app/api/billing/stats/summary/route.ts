import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'SUPERADMIN', 'STAFF');

    const [totalInvoices, paidInvoices, pendingInvoices, overdueInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({
        where: {
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const [totalRevenue, pendingAmount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PENDING' },
        _sum: { total: true },
      }),
    ]);

    return jsonResponse({
      success: true,
      data: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue: totalRevenue._sum.total || 0,
        pendingAmount: pendingAmount._sum.total || 0,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    console.error('Get billing stats error:', error);
    return errorResponse('Failed to get billing stats', 500);
  }
}
