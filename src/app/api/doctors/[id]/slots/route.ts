import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/doctors/[id]/slots
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return errorResponse('Date is required', 400);
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      return errorResponse('Doctor not found', 404);
    }

    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (!doctor.availableDays.includes(dayOfWeek)) {
      return jsonResponse({ success: true, data: [] });
    }

    // Get existing appointments for the date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = new Set(
      bookedAppointments.map((apt) =>
        apt.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    );

    // Generate available slots
    const slots: string[] = [];
    const [startHour, startMin] = doctor.availableFrom.split(':').map(Number);
    const [endHour, endMin] = doctor.availableTo.split(':').map(Number);
    const slotDuration = doctor.slotDuration;

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + slotDuration <= endTime) {
      const hours = Math.floor(currentTime / 60);
      const mins = currentTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      if (!bookedTimes.has(timeStr)) {
        slots.push(timeStr);
      }

      currentTime += slotDuration;
    }

    return jsonResponse({ success: true, data: slots });
  } catch (error) {
    console.error('Get slots error:', error);
    return errorResponse('Failed to get slots', 500);
  }
}
