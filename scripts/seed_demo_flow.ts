import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '../src/shared/db/index.js';
import { companies, users, purchase_requisitions, pr_items, pr_approvals, inbox_tasks, departments } from '../src/shared/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function seedFlows() {
  try {
    const allCompanies = await db.select().from(companies).limit(1);
    if (allCompanies.length === 0) {
      console.log("No companies found.");
      return;
    }
    const company = allCompanies[0];
    
    const companyUsers = await db.select().from(users).where(eq(users.companyId, company.id));
    if (companyUsers.length === 0) {
      console.log("No users found in company.");
      return;
    }
    
    // Choose users
    const requestor = companyUsers[0];
    const approver1 = companyUsers.find(u => u.uid !== requestor.uid) || companyUsers[0];
    
    console.log(`Using company: ${company.name}`);
    console.log(`Requestor: ${requestor.email} (${requestor.role})`);
    console.log(`Approver: ${approver1.email} (${approver1.role})`);

    // Clean up old demo PRs
    await db.delete(inbox_tasks).where(eq(inbox_tasks.title, 'Item Requisition Approval Required'));
    
    // Create 4 PRs to demonstrate various statuses
    
    // 1. Draft PR
    const prDraft = await db.insert(purchase_requisitions).values({
      companyId: company.id,
      requestor: requestor.name || 'Demo User',
      uid: requestor.uid,
      prNumber: 'PR-DRAFT-001',
      department: requestor.department || 'IT',
      priority: 'Low',
      estimatedCost: '500',
      justification: 'This is a draft PR for demo purposes.',
      status: 'Draft',
    }).returning();
    
    await db.insert(pr_items).values({
      prId: prDraft[0].id,
      itemName: 'Office Supplies',
      category: 'Stationery',
      quantity: 10,
      uom: 'Pcs',
      estimatedPrice: '50'
    });
    console.log(`Created Draft PR: ${prDraft[0].id}`);

    // 2. Pending Approval PR
    const prPending = await db.insert(purchase_requisitions).values({
      companyId: company.id,
      requestor: requestor.name || 'Demo User',
      uid: requestor.uid,
      prNumber: 'PR-PENDING-002',
      department: requestor.department || 'IT',
      priority: 'High',
      estimatedCost: '25000',
      justification: 'Urgent laptop replacement.',
      status: 'Pending Approval',
    }).returning();
    
    await db.insert(pr_items).values({
      prId: prPending[0].id,
      itemName: 'MacBook Pro M2',
      category: 'Electronics',
      quantity: 1,
      uom: 'Pcs',
      estimatedPrice: '25000'
    });
    
    const pendStep1 = await db.insert(pr_approvals).values({
      prId: prPending[0].id,
      stepOrder: 1,
      roleRequired: approver1.role,
      assigneeType: 'Role',
      assigneeValue: approver1.role,
      status: 'Pending'
    }).returning();
    
    await db.insert(pr_approvals).values({
      prId: prPending[0].id,
      stepOrder: 2,
      roleRequired: 'Admin',
      assigneeType: 'Role',
      assigneeValue: 'Admin',
      status: 'Pending'
    });
    
    await db.insert(inbox_tasks).values({
      companyId: company.id,
      assignedToUid: approver1.uid,
      assignedToRole: approver1.role,
      category: 'Procurement',
      title: 'Item Requisition Approval Required',
      message: `Request PR-PENDING-002 requires your approval.`,
      actionLink: `/inbox`,
      referenceType: 'PR',
      referenceId: prPending[0].id,
      status: 'Pending'
    });
    console.log(`Created Pending PR: ${prPending[0].id}`);

    // 3. Approved PR
    const prApproved = await db.insert(purchase_requisitions).values({
      companyId: company.id,
      requestor: requestor.name || 'Demo User',
      uid: requestor.uid,
      prNumber: 'PR-APPROVED-003',
      department: requestor.department || 'IT',
      priority: 'Medium',
      estimatedCost: '1500',
      justification: 'Approved chair replacement.',
      status: 'Approved',
    }).returning();
    
    await db.insert(pr_items).values({
      prId: prApproved[0].id,
      itemName: 'Ergonomic Chair',
      category: 'Furniture',
      quantity: 1,
      uom: 'Pcs',
      estimatedPrice: '1500'
    });
    
    await db.insert(pr_approvals).values({
      prId: prApproved[0].id,
      stepOrder: 1,
      roleRequired: approver1.role,
      assigneeType: 'Role',
      assigneeValue: approver1.role,
      status: 'Approved',
      approvedBy: approver1.uid,
      comments: 'Looks good'
    });
    
    await db.insert(inbox_tasks).values({
      companyId: company.id,
      assignedToUid: approver1.uid,
      category: 'Procurement',
      title: 'Item Requisition Approval Required',
      message: `Request PR-APPROVED-003 requires your approval.`,
      actionLink: `/inbox`,
      referenceType: 'PR',
      referenceId: prApproved[0].id,
      status: 'Completed'
    });
    console.log(`Created Approved PR: ${prApproved[0].id}`);

    // 4. Rejected PR
    const prRejected = await db.insert(purchase_requisitions).values({
      companyId: company.id,
      requestor: requestor.name || 'Demo User',
      uid: requestor.uid,
      prNumber: 'PR-REJECTED-004',
      department: requestor.department || 'IT',
      priority: 'Low',
      estimatedCost: '100000',
      justification: 'Luxury massage chair.',
      status: 'Rejected',
    }).returning();
    
    await db.insert(pr_items).values({
      prId: prRejected[0].id,
      itemName: 'Massage Chair',
      category: 'Furniture',
      quantity: 1,
      uom: 'Pcs',
      estimatedPrice: '100000'
    });
    
    await db.insert(pr_approvals).values({
      prId: prRejected[0].id,
      stepOrder: 1,
      roleRequired: approver1.role,
      assigneeType: 'Role',
      assigneeValue: approver1.role,
      status: 'Rejected',
      approvedBy: approver1.uid,
      comments: 'Too expensive, not necessary.'
    });
    
    await db.insert(inbox_tasks).values({
      companyId: company.id,
      assignedToUid: approver1.uid,
      category: 'Procurement',
      title: 'Item Requisition Approval Required',
      message: `Request PR-REJECTED-004 requires your approval.`,
      actionLink: `/inbox`,
      referenceType: 'PR',
      referenceId: prRejected[0].id,
      status: 'Completed'
    });
    console.log(`Created Rejected PR: ${prRejected[0].id}`);

    console.log("Demo flow data seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedFlows();
