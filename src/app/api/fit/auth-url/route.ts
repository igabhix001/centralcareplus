import { NextRequest } from 'next/server';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL 
  ? `${process.env.NEXT_PUBLIC_URL}/api/fit/oauth-callback`
  : 'http://localhost:3000/api/fit/oauth-callback';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    if (!GOOGLE_CLIENT_ID) {
      return errorResponse('Google OAuth not configured', 500);
    }

    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
      'https://www.googleapis.com/auth/fitness.body.read',
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(authUser.userId)}`;

    return jsonResponse({ success: true, data: { url: authUrl } });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Get auth URL error:', error);
    return errorResponse('Failed to get auth URL', 500);
  }
}
