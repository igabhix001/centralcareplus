import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/patient/health?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/patient/health?error=no_code`);
  }

  // In a full implementation, you would exchange the code for tokens here
  // For now, just redirect with success
  return NextResponse.redirect(`${baseUrl}/patient/health?connected=true`);
}
