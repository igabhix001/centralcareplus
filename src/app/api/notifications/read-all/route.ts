import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    await prisma.notification.updateMany({
      where: { userId: authUser.userId, isRead: false },
      data: { isRead: true },
    });

    return jsonResponse({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Mark all read error:', error);
    return errorResponse('Failed to mark notifications as read', 500);
  }
}
