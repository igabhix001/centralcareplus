import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: authUser.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: authUser.userId },
      }),
      prisma.notification.count({
        where: { userId: authUser.userId, isRead: false },
      }),
    ]);

    return jsonResponse({
      success: true,
      data: notifications,
      total,
      unreadCount,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get notifications error:', error);
    return errorResponse('Failed to get notifications', 500);
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();

    const { userId, title, message, type, link } = body;

    // Only admins can create notifications for others
    const targetUserId = ['SUPERADMIN', 'STAFF'].includes(authUser.role) && userId 
      ? userId 
      : authUser.userId;

    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title,
        message,
        type: type || 'INFO',
        link,
      },
    });

    return jsonResponse({ success: true, data: notification }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Create notification error:', error);
    return errorResponse('Failed to create notification', 500);
  }
}
