import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// Fix corrupted Google Fit data records
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const patient = await prisma.patient.findUnique({
      where: { userId: authUser.userId },
    });

    if (!patient) {
      return errorResponse('Patient not found', 404);
    }

    // Use raw MongoDB query to delete records with null createdAt
    // This fixes the data integrity issue
    const result = await prisma.$runCommandRaw({
      delete: 'google_fit_data',
      deletes: [
        {
          q: {
            patientId: { $oid: patient.id },
            $or: [
              { createdAt: null },
              { createdAt: { $exists: false } },
              { updatedAt: null },
              { updatedAt: { $exists: false } },
            ],
          },
          limit: 0, // 0 means delete all matching
        },
      ],
    });

    // Also delete any token records with null timestamps
    const tokenResult = await prisma.$runCommandRaw({
      delete: 'google_fit_tokens',
      deletes: [
        {
          q: {
            patientId: { $oid: patient.id },
            $or: [
              { createdAt: null },
              { createdAt: { $exists: false } },
              { updatedAt: null },
              { updatedAt: { $exists: false } },
            ],
          },
          limit: 0,
        },
      ],
    });

    return jsonResponse({
      success: true,
      data: {
        message: 'Cleaned up corrupted records. Please reconnect Google Fit and sync again.',
        dataRecordsDeleted: result,
        tokenRecordsDeleted: tokenResult,
      },
    });
  } catch (error: any) {
    console.error('Fix error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Failed to fix data',
    });
  }
}
