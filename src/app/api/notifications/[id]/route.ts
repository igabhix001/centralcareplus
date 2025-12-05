import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// PUT /api/notifications/[id] - Mark as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    if (notification.userId !== authUser.userId) {
      return errorResponse('Forbidden', 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return jsonResponse({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Update notification error:', error);
    return errorResponse('Failed to update notification', 500);
  }
}

// DELETE /api/notifications/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    if (notification.userId !== authUser.userId) {
      return errorResponse('Forbidden', 403);
    }

    await prisma.notification.delete({
      where: { id },
    });

    return jsonResponse({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Delete notification error:', error);
    return errorResponse('Failed to delete notification', 500);
  }
}
