import express from 'express';
import { db } from '../../../shared/db/index.js';
import { 
  purchase_orders, 
  purchase_requisitions, 
  vendors, 
  users 
} from '../../../shared/db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const resolveTenantId = async (req: any): Promise<string | undefined> => {
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && typeof headerTenantId === 'string') return headerTenantId;
  if (req.user && req.user.company_id) return req.user.company_id;
  if (req.user && req.user.companyId) return req.user.companyId;
  return undefined;
};

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const { 
      startDate, 
      endDate, 
      status, 
      vendorId, 
      prNumber 
    } = req.query;

    // Build where clause conditions
    const conditions = [eq(purchase_orders.companyId, companyId)];

    if (startDate) {
      conditions.push(gte(purchase_orders.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(purchase_orders.createdAt, end));
    }

    if (status) {
      conditions.push(eq(purchase_orders.status, status as string));
    }

    if (vendorId) {
      conditions.push(eq(purchase_orders.vendorId, parseInt(vendorId as string)));
    }

    if (prNumber) {
      conditions.push(eq(purchase_requisitions.prNumber, prNumber as string));
    }

    // Query data
    const reports = await db
      .select({
        id: purchase_orders.id,
        poNumber: purchase_orders.poNumber,
        totalAmount: purchase_orders.totalAmount,
        status: purchase_orders.status,
        deliveryDate: purchase_orders.deliveryDate,
        createdAt: purchase_orders.createdAt,
        prNumber: purchase_requisitions.prNumber,
        department: purchase_requisitions.department,
        vendorName: vendors.name,
        createdByEmail: users.email,
        createdByName: users.name
      })
      .from(purchase_orders)
      .leftJoin(purchase_requisitions, eq(purchase_orders.prId, purchase_requisitions.id))
      .leftJoin(vendors, eq(purchase_orders.vendorId, vendors.id))
      .leftJoin(users, eq(purchase_orders.createdBy, users.uid))
      .where(and(...conditions))
      .orderBy(desc(purchase_orders.createdAt));

    res.json(reports);
  } catch (error) {
    console.error('Error generating procurement report:', error);
    res.status(500).json({ error: 'Failed to generate procurement report' });
  }
});

export default router;
