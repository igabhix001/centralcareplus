import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonResponse, errorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get unique specializations from doctors
    const doctors = await prisma.doctor.findMany({
      select: { specialization: true },
      distinct: ['specialization'],
    });

    const specializations = doctors
      .map((d) => d.specialization)
      .filter(Boolean);

    // Add common specializations if not present
    const commonSpecializations = [
      'Cardiology',
      'Dermatology',
      'Endocrinology',
      'Gastroenterology',
      'General Medicine',
      'Neurology',
      'Oncology',
      'Ophthalmology',
      'Orthopedics',
      'Pediatrics',
      'Psychiatry',
      'Pulmonology',
      'Radiology',
      'Urology',
    ];

    const allSpecializations = Array.from(new Set([...specializations, ...commonSpecializations])).sort();

    return jsonResponse({ success: true, data: allSpecializations });
  } catch (error: any) {
    console.error('Get specializations error:', error);
    return errorResponse('Failed to get specializations', 500);
  }
}
