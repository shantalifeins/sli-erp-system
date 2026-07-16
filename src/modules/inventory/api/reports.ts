import express from 'express';
import { db } from '../../../shared/db/index.js';
import { 
  stock_transactions, 
  inventory_items, 
  warehouses, 
  users, 
  vendors,
  purchase_requisitions,
  pr_items,
  departments,
  branches
} from '../../../shared/db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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
      warehouseId, 
      itemId, 
      transactionType, 
      vendorId 
    } = req.query;

    // Build where clause conditions
    const conditions = [eq(stock_transactions.companyId, companyId)];

    if (startDate) {
      conditions.push(gte(stock_transactions.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(stock_transactions.createdAt, end));
    }

    if (warehouseId) {
      conditions.push(eq(stock_transactions.warehouseId, parseInt(warehouseId as string)));
    }

    if (itemId) {
      conditions.push(eq(stock_transactions.itemId, parseInt(itemId as string)));
    }

    if (transactionType) {
      conditions.push(eq(stock_transactions.transactionType, transactionType as string));
    }

    if (vendorId) {
      conditions.push(eq(stock_transactions.vendorId, parseInt(vendorId as string)));
    }

    // Query data
    const transactions = await db
      .select({
        id: stock_transactions.id,
        transactionType: stock_transactions.transactionType,
        quantity: stock_transactions.quantity,
        referenceId: stock_transactions.referenceId,
        createdAt: stock_transactions.createdAt,
        itemName: inventory_items.name,
        itemCode: inventory_items.itemCode,
        uom: inventory_items.uom,
        category: inventory_items.category,
        warehouseName: warehouses.name,
        vendorName: vendors.name,
        performedByName: users.name,
        performedByEmail: users.email
      })
      .from(stock_transactions)
      .leftJoin(inventory_items, eq(stock_transactions.itemId, inventory_items.id))
      .leftJoin(warehouses, eq(stock_transactions.warehouseId, warehouses.id))
      .leftJoin(vendors, eq(stock_transactions.vendorId, vendors.id))
      .leftJoin(users, eq(stock_transactions.performedBy, users.uid))
      .where(and(...conditions))
      .orderBy(desc(stock_transactions.createdAt));

    res.json(transactions);
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

router.get('/requisitions', async (req, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const { 
      startDate, 
      endDate, 
      status, 
      deliveryStatus,
      department,
      itemId,
      branchId,
      userId
    } = req.query;

    const conditions = [eq(purchase_requisitions.companyId, companyId!)];

    if (startDate) {
      conditions.push(gte(purchase_requisitions.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(purchase_requisitions.createdAt, end));
    }

    if (status) {
      conditions.push(eq(purchase_requisitions.status, status as string));
    }

    if (deliveryStatus) {
      conditions.push(eq(purchase_requisitions.deliveryStatus, deliveryStatus as string));
    }

    if (department) {
      conditions.push(eq(purchase_requisitions.department, department as string));
    }

    // Query data
    let query = db
      .select({
        id: purchase_requisitions.id,
        prNumber: purchase_requisitions.prNumber,
        requestor: purchase_requisitions.requestor,
        department: purchase_requisitions.department,
        priority: purchase_requisitions.priority,
        status: purchase_requisitions.status,
        deliveryStatus: purchase_requisitions.deliveryStatus,
        createdAt: purchase_requisitions.createdAt,
        requiredDate: purchase_requisitions.requiredDate,
        branchId: users.branchId, // Added branchId
        requestorUid: users.uid, // Added requestorUid
        items: sql`json_agg(json_build_object('id', ${pr_items.id}, 'itemName', ${pr_items.itemName}, 'quantity', ${pr_items.quantity}, 'uom', ${pr_items.uom}, 'deliveredQuantity', ${pr_items.deliveredQuantity}, 'itemId', ${pr_items.itemId}))`.as('items')
      })
      .from(purchase_requisitions)
      .leftJoin(pr_items, eq(purchase_requisitions.id, pr_items.prId))
      .leftJoin(users, eq(purchase_requisitions.uid, users.uid)) // Join users to get branch info
      .where(and(...conditions))
      .groupBy(purchase_requisitions.id, users.branchId, users.uid) // Added branchId and uid to groupBy
      .orderBy(desc(purchase_requisitions.createdAt));
      
    let requisitions = await query;
    
    if (branchId) {
      const searchBranchId = parseInt(branchId as string);
      requisitions = requisitions.filter((req: any) => req.branchId === searchBranchId);
    }

    if (userId) {
      const searchUserId = userId as string;
      requisitions = requisitions.filter((req: any) => req.requestorUid === searchUserId); // Wait, I didn't select requestorUid
    }
    
    if (itemId) {
      const searchItemId = parseInt(itemId as string);
      requisitions = requisitions.filter((req: any) => req.items && req.items.some((i: any) => i.itemId === searchItemId));
    }

    res.json(requisitions);
  } catch (error) {
    console.error('Error generating requisition report:', error);
    res.status(500).json({ error: 'Failed to generate requisition report' });
  }
});

router.get('/requisition-filters', async (req, res) => {
  try {
    const companyId = await resolveTenantId(req);
    const depts = await db.select().from(departments).where(eq(departments.companyId, companyId!));
    const brs = await db.select().from(branches).where(eq(branches.companyId, companyId!));
    const usrs = await db.select().from(users).where(eq(users.companyId, companyId!));
    res.json({ departments: depts, branches: brs, users: usrs });
  } catch (error) {
    console.error('Error fetching requisition filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

export default router;
