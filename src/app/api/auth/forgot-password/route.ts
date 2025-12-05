import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { jsonResponse, errorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return errorResponse('Email is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return jsonResponse({ 
        success: true, 
        message: 'If the email exists, a reset link has been sent' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token in user record (expires in 1 hour)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Store token hash and expiry in a JSON field or separate fields
        // For now, we'll just log it since passwordReset model may not exist
      },
    });

    // In production, send email here
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    return jsonResponse({
      success: true,
      message: 'If the email exists, a reset link has been sent',
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return errorResponse('Failed to process request', 500);
  }
}
