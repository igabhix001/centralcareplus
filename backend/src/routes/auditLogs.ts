import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Get all audit logs (Admin only)
router.get('/', authenticate, authorize('SUPERADMIN', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, action, entity, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Parse details JSON for each log
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    res.json({
      success: true,
      data: parsedLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

// Create audit log entry (internal use)
export const createAuditLog = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, any>
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export default router;
