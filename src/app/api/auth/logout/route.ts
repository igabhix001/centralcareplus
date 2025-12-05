import { NextRequest } from 'next/server';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    // In a real app, you might want to invalidate the token in a blacklist
    return jsonResponse({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse('Logout failed', 500);
  }
}
