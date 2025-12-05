import prisma from './prisma';

export type NotificationType = 
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'PRESCRIPTION_READY'
  | 'LAB_RESULTS'
  | 'PAYMENT_DUE'
  | 'PAYMENT_RECEIVED'
  | 'GENERAL';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string
) {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type, link },
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
}
