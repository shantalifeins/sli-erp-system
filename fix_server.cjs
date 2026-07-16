const fs = require('fs');
let code = fs.readFileSync('D:\\Procurement And inventory\\server.ts', 'utf8');

const replacement = `  app.post("/api/inventory/stock-out/approvals/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const requestId = parseInt(req.params.id);
      const { status, comments } = req.body; // 'Approved', 'Rejected', 'Review'
      
      const request = await db.select().from(stock_out_requests).where(eq(stock_out_requests.id, requestId)).limit(1);
      if (!request.length) return res.status(404).json({ error: "Not found" });
      if (request[0].status !== 'Pending' && status !== 'Review') {
        return res.status(400).json({ error: "Request is not pending" });
      }

      // Find pending approval step
      const approvals = await db.select().from(document_approvals)
        .where(and(eq(document_approvals.documentType, 'Stock Out'), eq(document_approvals.documentId, requestId)))
        .orderBy(document_approvals.stepOrder);
        
      const pendingStep = approvals.find(a => a.status === 'Pending');

      if (!pendingStep) {
        return res.status(400).json({ error: "No pending approvals for this Stock Out Request" });
      }

      const dbUser = await db.select().from(users).where(eq(users.uid, req.user.uid));
      const userRole = dbUser[0]?.role;
      
      let isAuthorized = false;
      if (userRole === 'Super Admin') {
        isAuthorized = true;
      } else {
        const roleReq = pendingStep.roleRequired;
        if (roleReq === 'Department Head' || roleReq.includes('Department')) {
          if (roleReq === userRole || dbUser[0]?.designation === roleReq) isAuthorized = true;
        } else {
          if (userRole === roleReq || dbUser[0]?.designation === roleReq) isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: "You do not have permission to approve this step" });
      }

      // Update approval step
      await db.update(document_approvals).set({
        status,
        comments,
        approvedBy: req.user.uid,
        updatedAt: new Date()
      }).where(eq(document_approvals.id, pendingStep.id));

      // Mark ALL pending inbox tasks for this Stock Out as Completed
      await db.update(inbox_tasks).set({
        status: 'Completed',
        updatedAt: new Date()
      }).where(and(
        eq(inbox_tasks.referenceType, 'StockOut'),
        eq(inbox_tasks.referenceId, requestId),
        eq(inbox_tasks.status, 'Pending')
      ));

      if (status === 'Rejected') {
        await db.update(stock_out_requests).set({ status: 'Rejected', updatedAt: new Date() }).where(eq(stock_out_requests.id, requestId));
      } else if (status === 'Review') {
        await db.update(stock_out_requests).set({ status: 'Draft', updatedAt: new Date() }).where(eq(stock_out_requests.id, requestId));
        await db.delete(document_approvals).where(and(eq(document_approvals.documentType, 'Stock Out'), eq(document_approvals.documentId, requestId), eq(document_approvals.status, 'Pending')));
      } else if (status === 'Approved') {
        const remainingSteps = approvals.filter(a => a.id !== pendingStep.id && a.status === 'Pending');
        if (remainingSteps.length === 0) {
          // ALL steps approved! Execute Stock Deduction
          const item = await db.select().from(inventory_items).where(eq(inventory_items.id, request[0].itemId)).limit(1);
          
          if (!item.length || item[0].quantityInStock < request[0].quantity) {
             // Revert the step to Pending because stock deduction failed
             await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
             return res.status(400).json({ error: "Insufficient global stock to finalize approval." });
          }

          // Check warehouse stock
          if (request[0].warehouseId) {
             const ws = await db.select().from(warehouse_stock).where(and(eq(warehouse_stock.warehouseId, request[0].warehouseId), eq(warehouse_stock.itemId, item[0].id))).limit(1);
             if (!ws.length || ws[0].quantity < request[0].quantity) {
                await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
                return res.status(400).json({ error: "Insufficient stock in the selected warehouse." });
             }
             // Deduct from warehouse
             await db.update(warehouse_stock).set({ quantity: ws[0].quantity - request[0].quantity }).where(eq(warehouse_stock.id, ws[0].id));
          }

          await db.update(stock_out_requests).set({ status: 'Approved', updatedAt: new Date() }).where(eq(stock_out_requests.id, requestId));

          await db.update(inventory_items)
            .set({ quantityInStock: item[0].quantityInStock - request[0].quantity })
            .where(eq(inventory_items.id, item[0].id));

          await db.insert(stock_transactions).values({
            companyId: request[0].companyId,
            itemId: item[0].id,
            warehouseId: request[0].warehouseId,
            transactionType: 'Stock Out',
            quantity: request[0].quantity,
            referenceId: request[0].requestNumber,
            performedBy: req.user.uid,
          });

          const ledger = await db.select().from(global_stock_ledger).where(and(eq(global_stock_ledger.companyId, request[0].companyId), eq(global_stock_ledger.itemId, item[0].id))).limit(1);
          if (ledger.length > 0) {
            await db.update(global_stock_ledger)
              .set({
                totalStockOut: ledger[0].totalStockOut + request[0].quantity,
                closingBalance: ledger[0].closingBalance - request[0].quantity,
                lastUpdated: new Date()
              })
              .where(eq(global_stock_ledger.id, ledger[0].id));
          }
        } else {
          // Notify next approver
          const nextStep = remainingSteps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
          const { notifyApprovers } = require('./src/shared/lib/notifications.js'); // Assuming we have this, but wait server.ts probably has notifyApprovers already!
          // We will just use the global notifyApprovers if it exists. Or create inbox task directly!
          await db.insert(inbox_tasks).values({
            companyId: request[0].companyId,
            assignedToRole: nextStep.assigneeValue || nextStep.roleRequired,
            category: 'Inventory',
            title: \`Pending Stock Out: \${request[0].requestNumber}\`,
            message: \`Stock Out \${request[0].requestNumber} requires your approval.\`,
            actionLink: \`/stock-out\`,
            referenceType: 'StockOut',
            referenceId: requestId,
            status: 'Pending'
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Approve stock out error:", error);
      res.status(500).json({ error: "Failed to process stock out approval" });
    }
  });`;

const targetStr = `  app.post("/api/inventory/stock-out/approvals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const requestId = parseInt(req.params.id);
      const { status, comments } = req.body; // 'Approved', 'Rejected', 'Review'
      
      const request = await db.select().from(stock_out_requests).where(eq(stock_out_requests.id, requestId)).limit(1);
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('D:\\Procurement And inventory\\server.ts', code);
  console.log('Successfully replaced');
} else {
  console.log('Target string not found');
}
