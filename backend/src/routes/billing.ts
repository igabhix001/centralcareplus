import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createNotification } from './notifications.js';

const router = Router();

const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const createInvoiceSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  tax: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

// Generate unique invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// Get invoices
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', status, patientId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    // Role-based filtering
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (!patient) throw new AppError('Patient not found', 404);
      where.patientId = patient.id;
    } else if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          patient: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// Get invoice by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Access control for patients
    if (req.user!.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
      if (invoice.patientId !== patient?.id) {
        throw new AppError('Access denied', 403);
      }
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

// Create invoice (admin/staff only)
router.post('/', authenticate, authorize('SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);

    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (data.tax || 0) - (data.discount || 0);

    const invoice = await prisma.invoice.create({
      data: {
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        invoiceNumber: generateInvoiceNumber(),
        items: data.items,
        subtotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        total,
        dueDate: new Date(data.dueDate),
        notes: data.notes,
      },
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    // Send notification to patient
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      include: { user: true },
    });
    if (patient) {
      await createNotification(
        patient.userId,
        'New Invoice',
        `Invoice #${invoice.invoiceNumber} has been generated. Amount: ₹${total.toFixed(2)}`,
        'PAYMENT_DUE',
        `/patient/billing/${invoice.id}`
      );
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice status (mark as paid, etc.)
router.put('/:id/status', authenticate, authorize('SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new AppError('Invoice not found', 404);

    const updateData: any = { status };
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      updateData.paymentMethod = paymentMethod;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    // Send notification for payment received
    if (status === 'PAID') {
      const patient = await prisma.patient.findUnique({ where: { id: invoice.patientId } });
      if (patient) {
        await createNotification(
          patient.userId,
          'Payment Received',
          `Payment for invoice #${invoice.invoiceNumber} has been received. Thank you!`,
          'PAYMENT_RECEIVED',
          `/patient/billing/${invoice.id}`
        );
      }
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Get billing stats (admin dashboard)
router.get('/stats/summary', authenticate, authorize('SUPERADMIN', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalPending,
      totalPaid,
      monthlyRevenue,
      overdueCount,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'PENDING' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: { status: 'PENDING', dueDate: { lt: today } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPending: totalPending._sum.total || 0,
        totalPaid: totalPaid._sum.total || 0,
        monthlyRevenue: monthlyRevenue._sum.total || 0,
        overdueCount,
      },
    });
  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({ error: 'Failed to get billing stats' });
  }
});

export default router;
