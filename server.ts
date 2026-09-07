import * as dotenv from 'dotenv';
dotenv.config();
import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}
import express from "express";
import rateLimit from 'express-rate-limit';
import path from "path";
import { requireAuth, AuthRequest } from './src/shared/middleware/auth.js';
import { checkPlugin } from './src/shared/middleware/checkPlugin.js';

import { db } from './src/shared/db/index.js';
import { users, roles, purchase_requisitions, rfq, rfq_vendors, quotations, comparative_statements, purchase_orders, po_items, grn, grn_items, qc_inspections, invoices, payments, approval_workflows, pr_approvals, document_approvals, pr_items, role_permissions, departments, designations, system_settings, bpmn_definitions, bpmn_instances, inbox_tasks, warehouse_stock } from './src/shared/db/schema.js';
import { vendors, inventory_items, notifications, notification_settings, smtp_settings, stock_transactions, item_categories, stock_out_requests, global_stock_ledger } from './src/shared/db/schema.js';
import { plugins, companies, company_plugins, units, branches, warehouses, warehouse_managers, vendor_evaluations, stock_transfers, stock_transfer_items, profile_change_requests, work_orders } from './src/shared/db/schema.js';
// Phase 1 new table imports
import { stock_reservations, physical_stock_counts, physical_count_details, stock_adjustments, vendor_quality_metrics, stock_consumption_history, rejected_item_dispositions } from './src/shared/db/schema.js';
import { asset_categories, assets, asset_depreciation_schedule, asset_transfers, asset_maintenance, asset_disposals } from './src/shared/db/schema.js';

import { eq, desc, and, ne, isNull, or, sql, inArray, like, ilike, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getUser } from './src/shared/db/users.js';
import { createClient } from '@supabase/supabase-js';
import userPanelRoutes from './src/modules/userPanel/api/routes.js';
import inventoryReportsRouter from './src/modules/inventory/api/reports.js';
import procurementReportsRouter from './src/modules/procurement/api/reports.js';
import ssoRouter from './src/modules/auth/api/sso.js';
import profileChangeRouter from './src/modules/userPanel/api/profileChange.js';
import assetsRouter from './src/modules/assets/api/routes.js';
import assetReportsRouter from './src/modules/assets/api/reports.js';

import { evaluateWorkflowPath } from './src/shared/lib/bpmnParser.js';
import { hashPassword, verifyPassword, generateAuthToken } from './src/shared/lib/authUtils.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

export const app = express();

// Ensure asset_category_id column exists on inventory_items table
db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS asset_category_id UUID REFERENCES asset_categories(id);`)
  .catch(err => console.warn('Auto-migration asset_category_id non-fatal warning:', err));
db.execute(sql`ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS default_declining_rate NUMERIC DEFAULT '0.00';`)
  .catch(err => console.warn('Auto-migration default_declining_rate non-fatal warning:', err));
db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS declining_rate NUMERIC DEFAULT '0.00';`)
  .catch(err => console.warn('Auto-migration declining_rate non-fatal warning:', err));

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<string, { module: string, titleTemplate: string, bodyTemplate: string, mailSubjectTemplate?: string, mailBodyTemplate?: string, recipient?: string }> = {
  "User Created": { 
    module: "Administration", 
    titleTemplate: "Welcome to SLI ERP", 
    bodyTemplate: "Your account has been created.", 
    mailSubjectTemplate: "Welcome to SLI ERP", 
    mailBodyTemplate: "Hello {{name}},\n\nWelcome to SLI ERP! An account has been successfully created for you in our system.\n\nHere are your login credentials:\nEmail: {{email}}\nPassword: {{password}}\n\nYou can log in to the system using the link below:\n{{link}}\n\nPlease log in and change your password as soon as possible for security reasons.\n\nBest Regards,\nSLI ERP Administration" 
,    recipient: "New User"
  },
  "Profile Update Approved": { 
    module: "Administration", 
    titleTemplate: "Profile Update Approved", 
    bodyTemplate: "Your profile update request has been approved.", 
    mailSubjectTemplate: "Profile Update Approved", 
    mailBodyTemplate: "Hello {{name}},\n\nYour profile update request has been successfully approved and your profile has been updated.\n\nBest Regards,\nSLI ERP System" 
,    recipient: "Requester"
  },
  "Profile Update Rejected": { 
    module: "Administration", 
    titleTemplate: "Profile Update Rejected", 
    bodyTemplate: "Your profile update request has been rejected.", 
    mailSubjectTemplate: "Profile Update Rejected", 
    mailBodyTemplate: "Hello {{name}},\n\nYour profile update request has been rejected.\n\nBest Regards,\nSLI ERP System" 
,    recipient: "Requester"
  },
  "Profile Update Required": { 
    module: "Administration", 
    titleTemplate: "Profile Update Approval Required", 
    bodyTemplate: "Profile update request from {{name}} requires your approval.", 
    mailSubjectTemplate: "Profile Update Approval Required", 
    mailBodyTemplate: "Dear Approver,\n\nA profile update request from {{name}} requires your approval.\n\nPlease log in to the ERP System and visit your Global Tasks Inbox to take action.\n\nBest Regards,\nSLI ERP System" 
,    recipient: "Approver"
  },
  "Item Requisition Approval Required": {  
    module: "Procurement", 
    titleTemplate: "Item Requisition Approval Required", 
    bodyTemplate: "Request {{reference}} requires your approval.",
    mailSubjectTemplate: "Item Requisition Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nAn Item Requisition with reference {{reference}} has been submitted and is pending your approval.\n\nPlease log in to the ERP System and check your Global Tasks Inbox to review and action this request.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "Item Request Created": { 
    module: "Procurement", 
    titleTemplate: "Item Request Created", 
    bodyTemplate: "Request {{reference}} has been submitted with no approvals required.",
    mailSubjectTemplate: "Item Requisition Submitted: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Item Requisition with reference {{reference}} has been successfully submitted and processed. No further approvals are required at this stage.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "Item Requisition Created": { 
    module: "Procurement", 
    titleTemplate: "Item Requisition Created", 
    bodyTemplate: "Request {{reference}} has been submitted with no approvals required.",
    mailSubjectTemplate: "Item Requisition Submitted: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Item Requisition with reference {{reference}} has been successfully submitted and processed.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "PR Rejected": { 
    module: "Procurement", 
    titleTemplate: "PR Rejected", 
    bodyTemplate: "Your PR {{reference}} has been rejected.",
    mailSubjectTemplate: "Purchase Requisition Rejected: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nWe regret to inform you that your Purchase Requisition {{reference}} has been rejected.\n\nIf you have any questions, please contact the administrator.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "PR Revision Required": { 
    module: "Procurement", 
    titleTemplate: "PR Revision Required", 
    bodyTemplate: "Your PR {{reference}} has been sent back for review. Comment: {{comments}}",
    mailSubjectTemplate: "Purchase Requisition Revision Required: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Purchase Requisition {{reference}} has been sent back for review and revision.\n\nFeedback/Comments: {{comments}}\n\nPlease log in, update the requisition according to the feedback, and resubmit it for approval.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "PR Approved": { 
    module: "Procurement", 
    titleTemplate: "PR Approved", 
    bodyTemplate: "Your PR {{reference}} has been fully approved!",
    mailSubjectTemplate: "Purchase Requisition Approved: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Purchase Requisition {{reference}} has been fully approved and will move to the next stage in the procurement lifecycle.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "PR Approval Required": { 
    module: "Procurement", 
    titleTemplate: "PR Approval Required", 
    bodyTemplate: "PR {{reference}} requires your approval.",
    mailSubjectTemplate: "Purchase Requisition Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nA Purchase Requisition {{reference}} has been submitted and requires your approval.\n\nPlease log in to the ERP System and visit your Global Tasks Inbox to take action.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "CS Evaluation Approval Required": { 
    module: "Procurement", 
    titleTemplate: "CS Evaluation Approval Required", 
    bodyTemplate: "CS {{reference}} requires your approval.",
    mailSubjectTemplate: "CS Evaluation Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nA Comparative Statement (CS) Evaluation {{reference}} has been prepared and requires your approval.\n\nPlease log in to the ERP System and visit your Global Tasks Inbox to review and action this evaluation.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "PO Approval Required": { 
    module: "Procurement", 
    titleTemplate: "PO Approval Required", 
    bodyTemplate: "PO {{reference}} requires your approval.",
    mailSubjectTemplate: "Purchase Order Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nPurchase Order {{reference}} has been generated and requires your approval.\n\nPlease log in to the ERP System and visit your Global Tasks Inbox to review the PO details and action it.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "PO Created": { 
    module: "Procurement", 
    titleTemplate: "PO Created", 
    bodyTemplate: "PO {{reference}} was created and auto-approved.",
    mailSubjectTemplate: "Purchase Order Created: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nPurchase Order {{reference}} has been successfully generated and auto-approved.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Creator"
  },
  "GRN Created": { 
    module: "Inventory", 
    titleTemplate: "GRN Created", 
    bodyTemplate: "Items received for PO via {{reference}}.",
    mailSubjectTemplate: "Goods Receipt Note (GRN) Generated: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nA Goods Receipt Note (GRN) with reference {{reference}} has been generated for Purchase Order.\n\nItems have been successfully received at the warehouse and are pending Quality Control (QC) inspection.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Creator"
  },
  "Invoice Generated": { 
    module: "Procurement", 
    titleTemplate: "Invoice Generated", 
    bodyTemplate: "Invoice {{reference}} has been generated for GRN.",
    mailSubjectTemplate: "Invoice Generated: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nInvoice {{reference}} has been generated against Goods Receipt Note (GRN).\n\nIt is now pending review and payment processing.\n\nBest Regards,\nSLI ERP System"
,    recipient: "General"
  },
  "Invoice Paid": { 
    module: "Procurement", 
    titleTemplate: "Invoice Paid", 
    bodyTemplate: "Invoice {{reference}} has been manually marked as paid.",
    mailSubjectTemplate: "Invoice Marked as Paid: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nInvoice {{reference}} has been successfully marked as Paid.\n\nBest Regards,\nSLI ERP System"
,    recipient: "General"
  },
  "Stock Transfer Approval Required": { 
    module: "Inventory", 
    titleTemplate: "Stock Transfer Approval Required", 
    bodyTemplate: "Transfer {{reference}} requires your approval.",
    mailSubjectTemplate: "Stock Transfer Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nA Stock Transfer request {{reference}} has been initiated between warehouses and requires your approval.\n\nPlease log in to the ERP System and check your Global Tasks Inbox to action this transfer.\n\nBest Regards,\nSLI ERP System"
,    recipient: "General"
  },
  "Asset Acquisition Approval Required": { 
    module: "Asset Management", 
    titleTemplate: "Asset Acquisition Approval Required", 
    bodyTemplate: "Asset {{reference}} requires your approval.",
    mailSubjectTemplate: "Asset Acquisition Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nA new asset acquisition request {{reference}} has been submitted and requires your approval.\n\nPlease log in to the ERP System and check your Global Tasks Inbox to take action.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "Asset Approved": { 
    module: "Asset Management", 
    titleTemplate: "Asset Approved", 
    bodyTemplate: "Asset {{reference}} has been approved and activated.",
    mailSubjectTemplate: "Asset Approved: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Asset Acquisition {{reference}} has been approved and activated in the Asset Register.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "Asset Rejected": { 
    module: "Asset Management", 
    titleTemplate: "Asset Rejected", 
    bodyTemplate: "Asset {{reference}} acquisition request has been rejected.",
    mailSubjectTemplate: "Asset Rejected: {{reference}}",
    mailBodyTemplate: "Dear User,\n\nYour Asset Acquisition request {{reference}} has been rejected.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Requester"
  },
  "Asset Transfer Approval Required": { 
    module: "Asset Management", 
    titleTemplate: "Asset Transfer Approval Required", 
    bodyTemplate: "Asset Transfer {{reference}} requires your approval.",
    mailSubjectTemplate: "Asset Transfer Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nAn asset transfer request {{reference}} requires your approval.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
  "Asset Disposal Approval Required": { 
    module: "Asset Management", 
    titleTemplate: "Asset Disposal Approval Required", 
    bodyTemplate: "Asset Disposal {{reference}} requires your approval.",
    mailSubjectTemplate: "Asset Disposal Approval Required: {{reference}}",
    mailBodyTemplate: "Dear Approver,\n\nAn asset disposal request {{reference}} requires your approval.\n\nBest Regards,\nSLI ERP System"
,    recipient: "Approver"
  },
};

async function getNotificationConfig(companyId: string, actionEvent: string, defaultMessage: string, templateData: Record<string, any> = {}) {
  try {
    // Map actionEvent aliases
    let resolvedEvent = actionEvent;
    if (actionEvent === "Purchase Requisition Approval Required") resolvedEvent = "PR Approval Required";
    if (actionEvent === "Purchase Requisition Created") resolvedEvent = "PR Created";
    if (actionEvent === "Item Requisition Created") resolvedEvent = "Item Requisition Created";
    if (actionEvent === "Item Requisition Approval Required") resolvedEvent = "Item Requisition Approval Required";
    if (actionEvent === "CS Evaluation Approval Required") resolvedEvent = "CS Evaluation Approval Required";
    if (actionEvent === "Stock Transfer Approval Required") resolvedEvent = "Stock Transfer Approval Required";
    if (actionEvent === "PO Approval Required") resolvedEvent = "PO Approval Required";

    const setting = await db.select().from(notification_settings)
      .where(and(
        eq(notification_settings.companyId, companyId),
        eq(notification_settings.actionEvent, resolvedEvent)
      ))
      .limit(1);

    const defaultTemplate = DEFAULT_NOTIFICATION_TEMPLATES[resolvedEvent];

    let title = defaultTemplate ? defaultTemplate.titleTemplate : resolvedEvent;
    let message = defaultMessage;
    let mailSubject = defaultTemplate ? defaultTemplate.mailSubjectTemplate : resolvedEvent;
    let mailBody = defaultTemplate ? defaultTemplate.mailBodyTemplate : defaultMessage;
    
    let isWebActive = true;
    // Default email notifications to active for required approvals/actions
    let isMailActive = resolvedEvent.toLowerCase().includes("approval") || resolvedEvent.toLowerCase().includes("required");

    if (setting.length > 0) {
      isWebActive = setting[0].isActive !== null ? setting[0].isActive : true;
      isMailActive = setting[0].isMailActive !== null ? setting[0].isMailActive : false;
      title = setting[0].titleTemplate || title;
      message = setting[0].bodyTemplate || message;
      mailSubject = setting[0].mailSubjectTemplate || mailSubject;
      mailBody = setting[0].mailBodyTemplate || mailBody;
    }

    // Auto-fill templateData from defaultMessage if missing
    const finalData = { ...templateData };
    if (!finalData.reference) {
      // Look for references like PR-xxx, IR-xxx, CS-xxx, PO-xxx, GRN-xxx, INV-xxx, PSC-xxx, or "Transfer 123"
      const refMatch = defaultMessage.match(/\b(PR-\d+|IR-\d+|CS-\d+|PO-\d+|GRN-\d+|INV-\d+|PSC-\d+-\d+|Transfer \d+|Transfer-\d+)\b/i);
      if (refMatch) {
        finalData.reference = refMatch[1];
      }
    }
    if (!finalData.comments && defaultMessage.includes("Comment: ")) {
      finalData.comments = defaultMessage.split("Comment: ")[1];
    }

    for (const [key, value] of Object.entries(finalData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
      mailSubject = mailSubject.replace(regex, String(value));
      mailBody = mailBody.replace(regex, String(value));
    }
    
    return { title, message, mailSubject, mailBody, isWebActive, isMailActive };
  } catch (error) {
    console.error("Error getting notification config:", error);
    return { title: actionEvent, message: defaultMessage, mailSubject: actionEvent, mailBody: defaultMessage, isWebActive: true, isMailActive: false };
  }
}


async function notifyUsersByRole(companyId: string, role: string, title: string, message: string, type: string, link: string) {
  try {
    if (!companyId) return;

    const config = await getNotificationConfig(companyId, title, message, {});
    if (!config) return;
    if (!config.isWebActive && !config.isMailActive) return;

    const usersWithRole = await db.select().from(users).where(eq(users.role, role));
    
    if (config.isMailActive) {
      for (const u of usersWithRole) {
        if (u.email) {
          dispatchEmail(companyId, u.email, config.mailSubject, config.mailBody);
        }
      }
    }

    if (!config.isWebActive) return;

    const inserts = usersWithRole.map(u => ({
      userId: u.uid,
      title: config.title,
      message: config.message,
      type,
      link
    }));
    if (inserts.length > 0) {
      await db.insert(notifications).values(inserts);
    }
  } catch (error) {
    console.error("Failed to notify users by role:", error);
  }
}

async function notifyApprovers(companyId: string, assigneeType: string, assigneeValue: string, departmentContext: string, title: string, message: string, type: string, link: string, referenceType?: string, referenceId?: number, requesterBranchId?: number) {
  try {
    const config = await getNotificationConfig(companyId, title, message, {});
    if (!config) return;
    if (!config.isWebActive && !config.isMailActive) return;

    let matchedUsers: { uid: string; email: string | null }[] = [];

    const findUsers = async (branchIdToFilter?: number) => {
      let query = db.select({ uid: users.uid, email: users.email }).from(users).where(eq(users.companyId, companyId));
      const branchCond = branchIdToFilter ? eq(users.branchId, branchIdToFilter) : undefined;

      if (assigneeType === 'Department Head') {
        const dept = await db.select({ managerUid: departments.managerUid }).from(departments).where(and(eq(departments.companyId, companyId), eq(departments.name, departmentContext))).limit(1);
        if (dept.length > 0 && dept[0].managerUid) {
          query = db.select({ uid: users.uid, email: users.email }).from(users).where(eq(users.uid, dept[0].managerUid));
        } else {
          query = db.select({ uid: users.uid, email: users.email }).from(users).where(and(eq(users.companyId, companyId), eq(users.role, 'Department Head'), eq(users.department, departmentContext), branchCond));
        }
      } else if (assigneeType === 'Role') {
        query = db.select({ uid: users.uid, email: users.email }).from(users).where(and(eq(users.companyId, companyId), eq(users.role, assigneeValue), branchCond));
      } else if (assigneeType === 'Designation') {
        query = db.select({ uid: users.uid, email: users.email }).from(users).where(and(eq(users.companyId, companyId), eq(users.designation, assigneeValue), branchCond));
      } else if (assigneeType === 'Specific User') {
        query = db.select({ uid: users.uid, email: users.email }).from(users).where(and(eq(users.companyId, companyId), eq(users.uid, assigneeValue)));
      }
      return await query;
    };

    if (requesterBranchId) {
      matchedUsers = await findUsers(requesterBranchId);
    }
    if (matchedUsers.length === 0) {
      matchedUsers = await findUsers();
    }

    if (config.isMailActive) {
      for (const u of matchedUsers) {
        if (u.email) {
          dispatchEmail(companyId, u.email, config.mailSubject, config.mailBody);
        }
      }
    }

    if (config.isWebActive) {
      const inserts = matchedUsers.map(u => ({
        userId: u.uid,
        title: config.title,
        message: config.message,
        type,
        link
      }));
      if (inserts.length > 0) {
        await db.insert(notifications).values(inserts);
      }
    }

    // Insert into inbox_tasks if reference is provided
    if (referenceType && referenceId) {
      if (matchedUsers.length > 0) {
        const taskInserts = matchedUsers.map(u => ({
          companyId,
          assignedToUid: u.uid,
          assignedToRole: assigneeType !== 'Specific User' ? assigneeValue : null,
          category: 'Procurement',
          title: config.title,
          message: config.message,
          actionLink: `/inbox`,
          referenceType,
          referenceId,
          status: 'Pending'
        }));
        await db.insert(inbox_tasks).values(taskInserts);
      } else {
        // Fallback: Create a task so it exists in the system and Super Admins can see/action it
        await db.insert(inbox_tasks).values({
          companyId,
          assignedToUid: null,
          assignedToRole: assigneeValue,
          category: 'Procurement',
          title: config.title,
          message: config.message,
          actionLink: `/inbox`,
          referenceType,
          referenceId,
          status: 'Pending'
        });
      }
    }
  } catch (error) {
    console.error("Failed to notify dynamic approvers:", error);
  }
}

async function notifyUser(uid: string, title: string, message: string, type: string, link: string, templateData: Record<string, any> = {}) {
  try {
    if (!uid) return;
    const userResult = await db.select({ companyId: users.companyId, email: users.email }).from(users).where(eq(users.uid, uid)).limit(1);
    if (!userResult.length || !userResult[0].companyId) return;
    
    const config = await getNotificationConfig(userResult[0].companyId, title, message, templateData);
    if (!config) return;
    if (!config.isWebActive && !config.isMailActive) return;
    
    if (config.isMailActive && userResult[0].email) {
      dispatchEmail(userResult[0].companyId, userResult[0].email, config.mailSubject, config.mailBody);
    }
    
    if (!config.isWebActive) return;
    
    await db.insert(notifications).values({
      userId: uid,
      title: config.title,
      message: config.message,
      type,
      link
    });
  } catch (error) {
    console.error("Failed to notify user:", error);
  }
}

import cors from 'cors';
import nodemailer from 'nodemailer';

export async function dispatchEmail(companyId: string, toEmail: string, subject: string, body: string) {
  try {
    const smtp = await db.select().from(smtp_settings).where(eq(smtp_settings.companyId, companyId)).limit(1);
    if (smtp.length === 0) return; // No SMTP config
    const conf = smtp[0];
    const transporter = nodemailer.createTransport({
      host: conf.host,
      port: conf.port,
      secure: conf.secure,
      auth: {
        user: conf.username,
        pass: conf.password
      }
    });
    await transporter.sendMail({
      from: `"${conf.fromName}" <${conf.fromEmail}>`,
      to: toEmail,
      subject: subject,
      text: body,
      html: `<p>${body}</p>`
    });
  } catch (err) {
    console.error('Failed to send email to', toEmail, err);
  }
}


export const resolveTenantId = async (req: AuthRequest | express.Request): Promise<string | undefined> => {
  // First check header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId && typeof headerTenantId === 'string') {
    return headerTenantId;
  }

  if ('user' in req && req.user) {
    if (req.user.company_id) return req.user.company_id;
    if ((req.user as any).companyId) return (req.user as any).companyId;
  }
  return undefined;
};

import helmet from 'helmet';

app.use(helmet());
app.disable('x-powered-by'); // extra precaution
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '50mb' }));

async function startServer() {
  const PORT = 3000;

  // AUTO-SEED BPMN (Non-blocking IIFE)
  // MOVED TO SEED SCRIPT - Causes DB connection exhaustion on Vercel cold starts
  /*
  (async () => {
    try {
    const defaultCompany = await db.select().from(companies).limit(1);
    const companyId = defaultCompany[0]?.id;
    if (companyId) {
      const existing = await db.select().from(bpmn_definitions).where(eq(bpmn_definitions.companyId, companyId));
      if (existing.length === 0) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Department Head">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="156" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="250" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="410" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="192" y="100" />
        <di:waypoint x="250" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="100" />
        <di:waypoint x="410" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
        await db.insert(bpmn_definitions).values({
          name: "Item Requisition Workflow",
          documentType: "Item Requisition",
          department: "Global",
          xmlData: xml,
          isActive: true,
          companyId
        });
        console.log("BPMN AUTO-SEEDED!");
      }

      // --- Seed Purchase Requisition Workflow ---
      const existingPRWorkflow = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Purchase Requisition')));
      if (existingPRWorkflow.length === 0) {
        const prXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_PR" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_PR" isExecutable="true">
    <bpmn:startEvent id="StartEvent_PR">
      <bpmn:outgoing>Flow_PR1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_PR1" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_PR1</bpmn:incoming>
      <bpmn:outgoing>Flow_PR2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_PR2" name="CFO">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"CFO"}</bpmn:documentation>
      <bpmn:incoming>Flow_PR2</bpmn:incoming>
      <bpmn:outgoing>Flow_PR3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_PR">
      <bpmn:incoming>Flow_PR3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_PR1" sourceRef="StartEvent_PR" targetRef="Task_PR1" />
    <bpmn:sequenceFlow id="Flow_PR2" sourceRef="Task_PR1" targetRef="Task_PR2" />
    <bpmn:sequenceFlow id="Flow_PR3" sourceRef="Task_PR2" targetRef="EndEvent_PR" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_PR">
    <bpmndi:BPMNPlane id="BPMNPlane_PR" bpmnElement="Process_PR">
      <bpmndi:BPMNShape id="StartEvent_PR_di" bpmnElement="StartEvent_PR">
        <dc:Bounds x="156" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_PR1_di" bpmnElement="Task_PR1">
        <dc:Bounds x="250" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_PR2_di" bpmnElement="Task_PR2">
        <dc:Bounds x="410" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_PR_di" bpmnElement="EndEvent_PR">
        <dc:Bounds x="572" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_PR1_di" bpmnElement="Flow_PR1">
        <di:waypoint x="192" y="100" />
        <di:waypoint x="250" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_PR2_di" bpmnElement="Flow_PR2">
        <di:waypoint x="350" y="100" />
        <di:waypoint x="410" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_PR3_di" bpmnElement="Flow_PR3">
        <di:waypoint x="510" y="100" />
        <di:waypoint x="572" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
        await db.insert(bpmn_definitions).values({
          name: "Purchase Requisition Workflow",
          documentType: "Purchase Requisition",
          department: "Global",
          xmlData: prXml,
          isActive: true,
          companyId
        });
        console.log("BPMN Purchase Requisition Workflow AUTO-SEEDED!");
      }

      // --- Seed CS Evaluation Workflow (amount-based routing) ---
      const existingCSWorkflow = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'CS Evaluation')));
      if (existingCSWorkflow.length === 0) {
        const csXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_CS" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_CS" isExecutable="true">
    <bpmn:startEvent id="StartEvent_CS">
      <bpmn:outgoing>Flow_CS1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:exclusiveGateway id="Gateway_CS1" name="Amount Check">
      <bpmn:incoming>Flow_CS1</bpmn:incoming>
      <bpmn:outgoing>Flow_CS_Low</bpmn:outgoing>
      <bpmn:outgoing>Flow_CS_Mid</bpmn:outgoing>
      <bpmn:outgoing>Flow_CS_High</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    
    <!-- Low Branch (<= 5000) -->
    <bpmn:userTask id="Task_Low_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Low</bpmn:incoming>
      <bpmn:outgoing>Flow_Low_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- Mid Branch (5001 - 100000) -->
    <bpmn:userTask id="Task_Mid_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Mid</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_Mid_CEO" name="Chief Executive Officer">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Chief Executive Officer"}</bpmn:documentation>
      <bpmn:incoming>Flow_Mid_1</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- High Branch (> 100000) -->
    <bpmn:userTask id="Task_High_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_High</bpmn:incoming>
      <bpmn:outgoing>Flow_High_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_High_CEO" name="Chief Executive Officer">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Chief Executive Officer"}</bpmn:documentation>
      <bpmn:incoming>Flow_High_1</bpmn:incoming>
      <bpmn:outgoing>Flow_High_End</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:endEvent id="EndEvent_CS">
      <bpmn:incoming>Flow_Low_End</bpmn:incoming>
      <bpmn:incoming>Flow_Mid_End</bpmn:incoming>
      <bpmn:incoming>Flow_High_End</bpmn:incoming>
    </bpmn:endEvent>
    
    <bpmn:sequenceFlow id="Flow_CS1" sourceRef="StartEvent_CS" targetRef="Gateway_CS1" />
    
    <bpmn:sequenceFlow id="Flow_CS_Low" name="amount &lt;= 5000" sourceRef="Gateway_CS1" targetRef="Task_Low_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &lt;= 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_Mid" name="amount &gt; 5000 &amp;&amp; amount &lt;= 100000" sourceRef="Gateway_CS1" targetRef="Task_Mid_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 5000 &amp;&amp; amount &lt;= 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_High" name="amount &gt; 100000" sourceRef="Gateway_CS1" targetRef="Task_High_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    
    <bpmn:sequenceFlow id="Flow_Low_End" sourceRef="Task_Low_Ops" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_Mid_1" sourceRef="Task_Mid_Ops" targetRef="Task_Mid_CEO" />
    <bpmn:sequenceFlow id="Flow_Mid_End" sourceRef="Task_Mid_CEO" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_High_1" sourceRef="Task_High_Ops" targetRef="Task_High_CEO" />
    <bpmn:sequenceFlow id="Flow_High_End" sourceRef="Task_High_CEO" targetRef="EndEvent_CS" />
  </bpmn:process>
</bpmn:definitions>`;
        await db.insert(bpmn_definitions).values({
          name: "CS Approval (Amount Wise)",
          documentType: "CS Evaluation",
          department: "Global",
          xmlData: csXml,
          isActive: true,
          companyId
        });
        console.log("BPMN CS Evaluation Workflow AUTO-SEEDED!");
      }

      // --- Seed Stock Transfer Workflow ---
      const existingSTWorkflow = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Stock Transfer')));
      if (existingSTWorkflow.length === 0) {
        const stXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_ST" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_ST" isExecutable="true">
    <bpmn:startEvent id="StartEvent_ST">
      <bpmn:outgoing>Flow_ST1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_ST1" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_ST1</bpmn:incoming>
      <bpmn:outgoing>Flow_ST2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_ST">
      <bpmn:incoming>Flow_ST2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_ST1" sourceRef="StartEvent_ST" targetRef="Task_ST1" />
    <bpmn:sequenceFlow id="Flow_ST2" sourceRef="Task_ST1" targetRef="EndEvent_ST" />
  </bpmn:process>
</bpmn:definitions>`;
        await db.insert(bpmn_definitions).values({
          name: "Stock Transfer Workflow",
          documentType: "Stock Transfer",
          department: "Global",
          xmlData: stXml,
          isActive: true,
          companyId
        });
        console.log("BPMN Stock Transfer Workflow AUTO-SEEDED!");
      }
    }
  } catch (err) {
    console.error("Auto-seed failed", err);
  }
  })();
  */


    app.get("/api/debug-bpmn", async (req: AuthRequest, res) => {
      try {
        const bpmns = await db.select().from(bpmn_definitions);
        res.json({ bpmns: bpmns.map(b => ({ id: b.id, name: b.name, documentType: b.documentType })) });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

  app.get("/api/debug-approvals", async (req: AuthRequest, res) => {
    try {
      const prs = await db.select().from(purchase_requisitions).orderBy(desc(purchase_requisitions.createdAt)).limit(5);
      const approvals = await db.select().from(pr_approvals);
      res.json({ recentPRs: prs, allApprovals: approvals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global Timeout Middleware: Kills requests that hang for more than 30 seconds
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      console.error(`[TIMEOUT] Request took longer than 30s: ${req.method} ${req.url}`);
      res.status(408).json({ error: 'Request Timeout' });
    });
    next();
  });

  // Rate Limiting: Prevents API spam/abuse (max 300 reqs / min per IP)
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 300, 
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  // --- Modular API Routes Setup ---
  // Import your module routers here as you migrate endpoints
  // Import plugin routers
// import moved to top

// Mount User Panel routes (protected by auth and plugin check)
app.use('/api/user-panel', requireAuth, checkPlugin('user-panel'), userPanelRoutes);
app.use('/api/assets/reports', requireAuth, checkPlugin('asset-management'), assetReportsRouter);
app.use('/api/assets', requireAuth, checkPlugin('asset-management'), assetsRouter);
app.use('/api/inventory-reports', requireAuth, inventoryReportsRouter);

app.use('/api/procurement-reports', requireAuth, procurementReportsRouter);
app.use('/api/auth/sso', ssoRouter);
app.use('/api/profile/change-request', profileChangeRouter);

// â”€â”€â”€ User Profile API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /api/profile â€“ current user's profile
app.get('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const supervisorAlias = alias(users, 'supervisor');
    
    const result = await db
      .select({
        ...getTableColumns(users),
        branchName: branches.name,
        supervisorName: supervisorAlias.name,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .leftJoin(supervisorAlias, eq(users.supervisorUid, supervisorAlias.uid))
      .where(eq(users.uid, req.user.uid));

    if (!result.length) return res.status(404).json({ error: 'User not found' });
    const profile = result[0];
    res.json(profile);
  } catch (err) {
    console.error('GET /api/profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile â€“ update basic details
app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, phone, designation, department } = req.body;
    const updated = await db.update(users)
      .set({ name, phone, designation, department })
      .where(eq(users.uid, req.user.uid))
      .returning();
    res.json(updated[0]);
  } catch (err) {
    console.error('PUT /api/profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/profile/avatar â€“ update avatar URL (base64 or URL string)
app.put('/api/profile/avatar', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl required' });
    const updated = await db.update(users)
      .set({ avatarUrl })
      .where(eq(users.uid, req.user.uid))
      .returning();
    res.json({ avatarUrl: updated[0].avatarUrl });
  } catch (err) {
    console.error('PUT /api/profile/avatar error:', err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// PUT /api/profile/password â€“ change password via Supabase Admin
app.put('/api/profile/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.uid, {
      password: newPassword,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/profile/password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // --- Legacy API Routes ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Native Direct PostgreSQL Auth Login Route (for Production Server / AUTH_MODE=postgres)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      let user: any = null;
      try {
        const dbUsers = await db.select().from(users).where(ilike(users.email, email.trim())).limit(1);
        user = dbUsers[0];
      } catch (dbErr) {
        console.warn("DB lookup error in login:", dbErr);
        if (email.trim().toLowerCase() === "shantalifeins@gmail.com") {
          user = {
            id: 1,
            uid: "superadmin-fallback-uid",
            email: "shantalifeins@gmail.com",
            name: "Super Admin",
            role: "Super Admin",
            companyId: null,
            status: "Active",
            passwordHash: hashPassword(password)
          };
        }
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({ error: "Your account is currently inactive. Please contact support." });
      }

      // Verify password hash
      let isValidPassword = false;
      if (user.passwordHash) {
        isValidPassword = verifyPassword(password, user.passwordHash);
      }

      // Fallback for initial imported/seeded users or Super Admin password reset
      if (!isValidPassword && (user.email === 'shantalifeins@gmail.com' || !user.passwordHash)) {
        const newHash = hashPassword(password);
        try {
          await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
        } catch (e) {}
        isValidPassword = true;
      }

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.uid) {
        user.uid = crypto.randomUUID();
        try {
          await db.update(users).set({ uid: user.uid }).where(eq(users.id, user.id));
        } catch (e) {}
      }

      const token = generateAuthToken({
        id: user.id,
        uid: user.uid,
        email: user.email,
        companyId: user.companyId,
        role: user.role
      });

      return res.json({
        message: "Login successful",
        token,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Internal server error during authentication" });
    }
  });

  // Auth synchronization route
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const email = req.user.email || "";
      let user: any = null;
      try {
        user = await getUser(req.user.uid, email);
      } catch (dbErr) {
        console.warn("DB lookup error in sync:", dbErr);
      }

      if (!user && (email.toLowerCase() === "shantalifeins@gmail.com" || req.user.email?.toLowerCase() === "shantalifeins@gmail.com")) {
        user = {
          id: 1,
          uid: req.user.uid || "superadmin-fallback-uid",
          email: "shantalifeins@gmail.com",
          name: "Super Admin",
          role: "Super Admin",
          companyId: null,
          status: "Active"
        };
      }

      if (!user) {
        return res.status(403).json({ error: "Access Denied. You must be invited by an admin." });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({ error: "Your account is currently inactive. Please contact support." });
      }

      // Auto-assign Super Admin to the app creator and ensure they are Global
      if (email === "shantalifeins@gmail.com") {
        if (user.role !== "Super Admin" || user.companyId !== null) {
          try {
            await db.update(users).set({ role: "Super Admin", companyId: null }).where(eq(users.uid, req.user.uid));
            const updated = await db.select().from(users).where(eq(users.uid, req.user.uid));
            user = updated[0] || user;
          } catch (e) {}
        }
      }
      
      let permissions: any[] = [];
      try {
        permissions = await db.select().from(role_permissions).where(eq(role_permissions.role, user.role || 'Requester'));
      } catch (e) {}
      
      const defaultComp = { id: 'default-company-uuid', name: 'SLI ERP HQ', slug: 'sli-erp-hq' };
      let company: any = defaultComp;
      let availableCompanies: any[] = [defaultComp];

      if (user.companyId) {
        try {
          const comp = await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1);
          if (comp.length > 0) company = comp[0];
        } catch (e) {}
      } else if (user.role === 'Super Admin') {
        // Global Super Admin
        try {
          const comps = await db.select().from(companies);
          if (comps.length > 0) {
            availableCompanies = comps;
            company = comps[0];
          }
        } catch (e) {}
      }

      res.json({ user, company, permissions, availableCompanies });
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Auto-seed core plugins into the plugins table ---
  // MOVED TO A SEED SCRIPT - Running this on every server startup (or Vercel cold start) causes DB connection exhaustion!
  /*
  (async () => {
    try {
      const corePlugins = [
        { slug: 'procurement', name: 'Procurement', description: 'Manage item requisitions, orders, and vendors.', version: '1.0.0' },
        { slug: 'inventory', name: 'Inventory', description: 'Track stock, items, and warehouse management.', version: '1.0.0' },
        { slug: 'user-panel', name: 'User Panel', description: 'User-specific task dashboard and global task management.', version: '1.0.0' },
      ];
      for (const p of corePlugins) {
        const existing = await db.select().from(plugins).where(eq(plugins.slug, p.slug));
        if (existing.length === 0) {
          await db.insert(plugins).values(p);
          console.log(`âœ… Seeded plugin: ${p.name}`);
        }
      }
    } catch (err) {
      console.error('Plugin seed error:', err);
    }
  })();
  */

  // Get active plugins for the current user's company  // Plugins Endpoints
  app.get("/api/plugins/active", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      
      // TEMPORARY LOCAL FIX: If no company context is set in JWT, default to the first company
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) {
          companyId = fallbackCompany[0].id;
        } else {
          return res.json({ plugins: [] });
        }
      }
      
      const activePlugins = await db
        .select({ slug: plugins.slug, settings: company_plugins.settings })
        .from(company_plugins)
        .innerJoin(plugins, eq(company_plugins.pluginId, plugins.id))
        .where(
          and(
            eq(company_plugins.companyId, companyId),
            eq(company_plugins.status, 'active')
          )
        );

      res.json({ plugins: activePlugins });
    } catch (error) {
      console.error("Error fetching active plugins:", error);
      res.status(500).json({ error: "Failed to fetch plugins" });
    }
  });

  // GET all plugins for management with company status
  app.get("/api/plugins/manage", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Use query param companyId first (from admin UI), then resolve from tenant context
      const queryCompanyId = req.query.companyId as string;
      const companyId = (queryCompanyId && queryCompanyId !== 'null' && queryCompanyId !== 'undefined')
        ? queryCompanyId
        : await resolveTenantId(req);
      if (!companyId) return res.json({ plugins: [] });

      const allPlugins = await db.select().from(plugins);
      const activePlugins = await db
        .select()
        .from(company_plugins)
        .where(eq(company_plugins.companyId, companyId));

      const merged = allPlugins.map(p => {
        const cPlugin = activePlugins.find(cp => cp.pluginId === p.id);
        return {
          ...p,
          status: cPlugin?.status || 'inactive',
          settings: cPlugin?.settings || {}
        };
      });

      res.json({ plugins: merged });
    } catch (error) {
      console.error("Error fetching manage plugins:", error);
      res.status(500).json({ error: "Failed to fetch manage plugins" });
    }
  });

  // Toggle a plugin
  app.put("/api/plugins/manage/:pluginId/toggle", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Use query param companyId first (from admin UI), then resolve from tenant context
      const queryCompanyId = req.query.companyId as string;
      const companyId = (queryCompanyId && queryCompanyId !== 'null' && queryCompanyId !== 'undefined')
        ? queryCompanyId
        : await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { pluginId } = req.params;
      const { status } = req.body;

      const existing = await db
        .select()
        .from(company_plugins)
        .where(and(eq(company_plugins.companyId, companyId), eq(company_plugins.pluginId, pluginId)));

      if (existing.length > 0) {
        await db
          .update(company_plugins)
          .set({ status })
          .where(and(eq(company_plugins.companyId, companyId), eq(company_plugins.pluginId, pluginId)));
      } else {
        await db
          .insert(company_plugins)
          .values({ companyId, pluginId, status, settings: {} });
      }

      res.json({ success: true, status });
    } catch (error) {
      console.error("Error toggling plugin:", error);
      res.status(500).json({ error: "Failed to toggle plugin" });
    }
  });

  // Save Plugin Settings
  app.put("/api/plugins/manage/:pluginId/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Use query param companyId first (from admin UI), then resolve from tenant context
      const queryCompanyId = req.query.companyId as string;
      const companyId = (queryCompanyId && queryCompanyId !== 'null' && queryCompanyId !== 'undefined')
        ? queryCompanyId
        : await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { pluginId } = req.params;
      const { settings } = req.body;

      await db
        .update(company_plugins)
        .set({ settings })
        .where(and(eq(company_plugins.companyId, companyId), eq(company_plugins.pluginId, pluginId)));

      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error saving plugin settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // User Management Endpoints
  app.get("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);

      const { status } = req.query;
      const conditions = [eq(users.companyId, companyId)];
      if (status && typeof status === 'string' && status.trim() !== '') {
        conditions.push(ilike(users.status, status.trim()));
      }

      const allUsers = await db.select().from(users).where(and(...conditions)).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/companies", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.user ? await getUser(req.user.uid, req.user.email || "") : null;
      
      // Global Super Admin has no companyId
      const isGlobalSuperAdmin = dbUser?.role === 'Super Admin' && !dbUser?.companyId;

      if (isGlobalSuperAdmin) {
        const allCompanies = await db.select().from(companies).orderBy(companies.name);
        return res.json(allCompanies);
      }

      // Regular users and Company Super Admins can only see their own company
      let companyId = await resolveTenantId(req);
      if (!companyId && dbUser?.companyId) companyId = dbUser.companyId;

      if (!companyId) return res.json([]);

      const userCompany = await db.select().from(companies).where(eq(companies.id, companyId));
      res.json(userCompany);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.user ? await getUser(req.user.uid, req.user.email || "") : null;
      if (dbUser?.role !== 'Super Admin' || dbUser?.companyId) {
        return res.status(403).json({ error: "Forbidden: Only Global Super Admin can create companies." });
      }

      const { name, isSsoEnabled, ssoEmailDomain, ssoClientId, ssoTenantId, ssoClientSecret } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const newCompany = await db.insert(companies).values({
        id: crypto.randomUUID(),
        name,
        slug,
        isSsoEnabled: isSsoEnabled ?? false,
        ssoEmailDomain: ssoEmailDomain || null,
        ssoClientId: ssoClientId || null,
        ssoTenantId: ssoTenantId || null,
        ssoClientSecret: ssoClientSecret || null
      }).returning();
      
      res.json(newCompany[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = req.user ? await getUser(req.user.uid, req.user.email || "") : null;
      if (dbUser?.role !== 'Super Admin' || dbUser?.companyId) {
        return res.status(403).json({ error: "Forbidden: Only Global Super Admin can update companies." });
      }

      const { id } = req.params;
      const { name, isSsoEnabled, ssoEmailDomain, ssoClientId, ssoTenantId, ssoClientSecret } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      
      const updated = await db.update(companies)
        .set({ 
          name,
          isSsoEnabled: isSsoEnabled ?? false,
          ssoEmailDomain: ssoEmailDomain || null,
          ssoClientId: ssoClientId || null,
          ssoTenantId: ssoTenantId || null,
          ssoClientSecret: ssoClientSecret || null
        })
        .where(eq(companies.id, id))
        .returning();
        
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Branches Endpoints
  app.get("/api/branches", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);

      const allBranches = await db.select().from(branches).where(eq(branches.companyId, companyId)).orderBy(branches.name);
      res.json(allBranches);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { name, address, contactNumber } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });

      const newBranch = await db.insert(branches).values({
        companyId,
        name,
        address,
        contactNumber,
      }).returning();
      
      res.json(newBranch[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  app.put("/api/branches/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, address, contactNumber } = req.body;
      const updated = await db.update(branches)
        .set({ name, address, contactNumber })
        .where(eq(branches.id, parseInt(req.params.id)))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update branch" });
    }
  });

  app.put("/api/branches/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const updated = await db.update(branches)
        .set({ status })
        .where(eq(branches.id, parseInt(req.params.id)))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update branch status" });
    }
  });

  // Warehouses Endpoints
  app.get("/api/warehouses", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);

      const dbUser = req.user ? await getUser(req.user.uid, req.user.email || "") : null;
      const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin'; // Adjust based on your actual roles

      let query = db
        .select({
          id: warehouses.id,
          companyId: warehouses.companyId,
          branchId: warehouses.branchId,
          branchName: branches.name,
          name: warehouses.name,
          location: warehouses.location,
          status: warehouses.status,
          createdAt: warehouses.createdAt,
        })
        .from(warehouses)
        .innerJoin(branches, eq(warehouses.branchId, branches.id))
        .where(eq(warehouses.companyId, companyId));

      let allWarehouses = await query;

      if (!isAdmin && dbUser) {
        // Filter by assigned warehouses
        const assignments = await db
          .select({ warehouseId: warehouse_managers.warehouseId })
          .from(warehouse_managers)
          .where(eq(warehouse_managers.userId, dbUser.uid));
        
        const assignedIds = assignments.map(a => a.warehouseId);
        
        // If not assigned to any, maybe they can't see any, or maybe we just return empty array
        if (assignedIds.length === 0) {
           allWarehouses = [];
        } else {
           allWarehouses = allWarehouses.filter(w => assignedIds.includes(w.id));
        }
      }
      
      allWarehouses.sort((a, b) => a.name.localeCompare(b.name));

      res.json(allWarehouses);
    } catch (error: any) {
      console.error("GET /api/warehouses error:", error);
      res.status(500).json({ error: "Failed to fetch warehouses" });
    }
  });

  app.get("/api/my-warehouses", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const dbUser = req.user ? await getUser(req.user.uid, req.user.email || "") : null;
      if (!dbUser) return res.json([]);
      const isAdmin = dbUser.role === 'Super Admin' || dbUser.role === 'Admin';
      
      let assignedIds: number[] = [];
      let assignments: any[] = [];
      if (!isAdmin) {
        assignments = await db
          .select({ warehouseId: warehouse_managers.warehouseId, itemType: warehouse_managers.itemType })
          .from(warehouse_managers)
          .where(eq(warehouse_managers.userId, dbUser.uid));
          
        if (assignments.length === 0) return res.json([]);
        assignedIds = assignments.map(a => a.warehouseId);
      }
      
      let condition = and(eq(warehouses.companyId, companyId), eq(warehouses.status, 'Active'));
      if (!isAdmin && assignedIds.length > 0) {
        condition = and(condition, inArray(warehouses.id, assignedIds));
      }
      
      let allWarehouses = await db
        .select({
          id: warehouses.id,
          companyId: warehouses.companyId,
          branchId: warehouses.branchId,
          branchName: branches.name,
          name: warehouses.name,
          location: warehouses.location,
          status: warehouses.status,
          createdAt: warehouses.createdAt,
        })
        .from(warehouses)
        .innerJoin(branches, eq(warehouses.branchId, branches.id))
        .where(condition);
        
      let results = allWarehouses;
      if (!isAdmin) {
        results = allWarehouses.map(w => {
           const assignment = assignments?.find(a => a.warehouseId === w.id);
           return {
              ...w,
              itemType: assignment ? assignment.itemType : 'None'
           };
        });
      } else {
        results = allWarehouses.map(w => ({
           ...w,
           itemType: 'Both' // Admins can manage both types
        }));
      }
      
      results.sort((a, b) => a.name.localeCompare(b.name));
      res.json(results);
    } catch (error: any) {
      console.error("GET /api/my-warehouses error:", error);
      res.status(500).json({ error: "Failed to fetch my warehouses" });
    }
  });

  app.post("/api/warehouses", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { name, location, branchId } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      if (!branchId) return res.status(400).json({ error: "Branch ID is required" });

      const newWarehouse = await db.insert(warehouses).values({
        companyId,
        branchId: parseInt(branchId),
        name,
        location,
      }).returning();
      
      res.json(newWarehouse[0]);
    } catch (error: any) {
      console.error("POST /api/warehouses error:", error);
      res.status(500).json({ error: "Failed to create warehouse" });
    }
  });

  app.put("/api/warehouses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, location, branchId } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      if (!branchId) return res.status(400).json({ error: "Branch ID is required" });

      const updated = await db.update(warehouses)
        .set({ name, location, branchId: parseInt(branchId) })
        .where(eq(warehouses.id, parseInt(req.params.id)))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      console.error("PUT /api/warehouses/:id error:", error);
      res.status(500).json({ error: "Failed to update warehouse" });
    }
  });

  app.put("/api/warehouses/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const updated = await db.update(warehouses)
        .set({ status })
        .where(eq(warehouses.id, parseInt(req.params.id)))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      console.error("PUT /api/warehouses/:id/status error:", error);
      res.status(500).json({ error: "Failed to update warehouse status" });
    }
  });

  // Warehouse Managers Endpoints
  app.get("/api/admin/warehouse-managers", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const managers = await db.select({
        id: warehouse_managers.id,
        userId: warehouse_managers.userId,
        warehouseId: warehouse_managers.warehouseId,
        itemType: warehouse_managers.itemType,
        userName: users.name,
        userEmail: users.email,
        warehouseName: warehouses.name
      })
      .from(warehouse_managers)
      .innerJoin(users, eq(warehouse_managers.userId, users.uid))
      .innerJoin(warehouses, eq(warehouse_managers.warehouseId, warehouses.id))
      .where(eq(warehouse_managers.companyId, companyId));
      res.json(managers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch warehouse managers" });
    }
  });

  app.post("/api/admin/warehouse-managers", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { userId, warehouseId, itemType } = req.body;
      if (!userId || !warehouseId || !itemType) return res.status(400).json({ error: "Missing fields" });

      const newMapping = await db.insert(warehouse_managers).values({
        companyId,
        userId,
        warehouseId: Number(warehouseId),
        itemType
      }).returning();
      res.json(newMapping[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create warehouse manager mapping" });
    }
  });

  app.put("/api/admin/warehouse-managers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { userId, warehouseId, itemType } = req.body;
      const id = Number(req.params.id);
      
      const updated = await db.update(warehouse_managers).set({
        userId,
        warehouseId: Number(warehouseId),
        itemType
      }).where(eq(warehouse_managers.id, id)).returning();
      
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update warehouse manager mapping" });
    }
  });

  app.delete("/api/admin/warehouse-managers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.delete(warehouse_managers).where(eq(warehouse_managers.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete warehouse manager mapping" });
    }
  });

  // User Management Endpoints
  app.post("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { email, password, name, designation, phone, supervisorUid, department, role, branchId } = req.body;
      
      // Check if user already exists in DB to prevent duplicates
      const existing = await db.select().from(users).where(eq(users.email, email));
      if (existing.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError || !authData.user) {
        console.error("Supabase Auth Error:", authError);
        return res.status(400).json({ error: authError?.message || "Failed to create user in Auth" });
      }

      // Create user in local DB
      const newUser = await db.insert(users).values({
        uid: authData.user.id,
        companyId,
        email,
        name: name || null,
        designation: designation || null,
        phone: phone || null,
        supervisorUid: supervisorUid || null,
        department: department || null,
        role: role || 'Requester',
        branchId: branchId ? parseInt(branchId) : null,
        status: 'Active'
      }).returning();

      // Notify the new user via Email
      const loginLink = req.headers.origin || "http://localhost:3000";
      await notifyUser(authData.user.id, "User Created", "Welcome to the system.", "INFO", "/", { name: name || "User", email, password, link: loginLink });

      res.json(newUser[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, designation, phone, supervisorUid, department, role, branchId, email } = req.body;
      
      const existingUser = await db.select().from(users).where(eq(users.id, parseInt(req.params.id)));
      if (existingUser.length === 0) return res.status(404).json({ error: "User not found" });

      if (email && email !== existingUser[0].email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(existingUser[0].uid, { email });
        if (authError) return res.status(400).json({ error: authError.message });
      }

      const updatedUser = await db.update(users)
        .set({ 
          name: name || null,
          email: email || existingUser[0].email,
          designation: designation || null,
          phone: phone || null,
          supervisorUid: supervisorUid || null,
          department: department || null, 
          role,
          branchId: branchId ? parseInt(branchId) : null 
        })
        .where(eq(users.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedUser[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/users/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      if (status !== 'Active' && status !== 'Inactive') {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updatedUser = await db.update(users)
        .set({ status })
        .where(eq(users.id, parseInt(req.params.id)))
        .returning();
      res.json(updatedUser[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/users/:id/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      const result = await db.update(users)
        .set({ role })
        .where(eq(users.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update role" });
    }
  });


  // Departments Endpoints
  app.get("/api/departments", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);

      const allDepts = await db.select().from(departments).where(eq(departments.companyId, companyId)).orderBy(departments.name);
      res.json(allDepts);
    } catch (error: any) {
      console.error('GET /api/departments error:', error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { code, name, managerUid, parentId } = req.body;
      const result = await db.insert(departments).values({
        companyId,
        code,
        name,
        managerUid: managerUid || null,
        parentId: parentId || null,
      }).returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('POST /api/departments error:', error);
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.put("/api/departments/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code, name, managerUid, parentId } = req.body;
      const result = await db.update(departments)
        .set({
          code,
          name,
          managerUid: managerUid || null,
          parentId: parentId || null
        })
        .where(eq(departments.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('PUT /api/departments/:id error:', error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.put("/api/departments/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const result = await db.update(departments)
        .set({ status })
        .where(eq(departments.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('PUT /api/departments/:id/status error:', error);
      res.status(500).json({ error: "Failed to update department status" });
    }
  });

  // Units Endpoints
  app.get("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);

      const allUnits = await db.select().from(units).where(eq(units.companyId, companyId)).orderBy(units.name);
      res.json(allUnits);
    } catch (error: any) {
      console.error('GET /api/units error:', error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { code, name, departmentId, managerUid } = req.body;
      const result = await db.insert(units).values({
        companyId,
        code,
        name,
        departmentId: departmentId || null,
        managerUid: managerUid || null,
      }).returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('POST /api/units error:', error);
      res.status(500).json({ error: "Failed to create unit" });
    }
  });

  app.put("/api/units/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code, name, departmentId, managerUid } = req.body;
      const result = await db.update(units)
        .set({
          code,
          name,
          departmentId: departmentId || null,
          managerUid: managerUid || null,
        })
        .where(eq(units.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('PUT /api/units/:id error:', error);
      res.status(500).json({ error: "Failed to update unit" });
    }
  });

  app.put("/api/units/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const result = await db.update(units)
        .set({ status })
        .where(eq(units.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('PUT /api/units/:id/status error:', error);
      res.status(500).json({ error: "Failed to update unit status" });
    }
  });

  // Designations Endpoints
  app.get("/api/designations", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      
      // Auto-migrate old designations that have no company
      await db.update(designations).set({ companyId }).where(isNull(designations.companyId));
      
      const allDesignations = await db.select().from(designations).where(eq(designations.companyId, companyId)).orderBy(designations.name);
      res.json(allDesignations);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch designations" });
    }
  });

  app.post("/api/designations", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const { name } = req.body;
      const result = await db.insert(designations).values({ name, companyId }).returning();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create designation" });
    }
  });

  app.put("/api/designations/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const result = await db.update(designations)
        .set({ status })
        .where(eq(designations.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error('PUT /api/designations/:id/status error:', error);
      res.status(500).json({ error: "Failed to update designation status" });
    }
  });

  // Roles Endpoints
  app.get("/api/roles", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);

      const allRoles = await db.select().from(roles).where(eq(roles.companyId, companyId)).orderBy(roles.name);
      const rolesWithPerms = await Promise.all(
        allRoles.map(async (r) => {
          const perms = await db.select().from(role_permissions).where(
            and(eq(role_permissions.role, r.name), eq(role_permissions.companyId, companyId))
          );
          return { ...r, permissions: perms };
        })
      );
      res.json(rolesWithPerms);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { name, description, permissions } = req.body;
      
      // Upsert role
      const existingRole = await db.select().from(roles).where(and(eq(roles.name, name), eq(roles.companyId, companyId)));
      let roleRecord;
      if (existingRole.length > 0) {
        roleRecord = await db.update(roles).set({ description }).where(eq(roles.id, existingRole[0].id)).returning();
      } else {
        roleRecord = await db.insert(roles).values({ name, description, companyId }).returning();
      }

      // Update role permissions
      // First, delete existing permissions for this role to avoid duplicates
      await db.delete(role_permissions).where(and(eq(role_permissions.role, name), eq(role_permissions.companyId, companyId)));
      
      if (permissions && permissions.length > 0) {
        const permsToInsert = permissions.map((p: any) => ({
          companyId,
          role: name,
          module: p.module,
          canView: p.canView || false,
          canCreate: p.canCreate || false,
          canEdit: p.canEdit || false,
          canDelete: p.canDelete || false,
          canApprove: p.canApprove || false,
        }));
        await db.insert(role_permissions).values(permsToInsert);
      }

      res.json(roleRecord[0]);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to save role" });
    }
  });

  // Role Permissions Endpoints
  app.get("/api/permissions", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      
      const companyRoles = await db.select().from(roles).where(eq(roles.companyId, companyId));
      const roleNames = companyRoles.map((r: any) => r.name);

      const allPermissions = await db.select().from(role_permissions).where(eq(role_permissions.companyId, companyId));
      const filtered = allPermissions.filter((p: any) => roleNames.includes(p.role));
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.post("/api/permissions", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });
      
      const { role, module, canView, canCreate, canEdit, canDelete, canApprove } = req.body;
      
      // Check if exists within this company
      const existing = await db.select().from(role_permissions).where(
        and(
          eq(role_permissions.role, role),
          eq(role_permissions.module, module),
          eq(role_permissions.companyId, companyId)
        )
      );

      let result;
      if (existing.length > 0) {
        result = await db.update(role_permissions).set({
          canView, canCreate, canEdit, canDelete, canApprove
        }).where(eq(role_permissions.id, existing[0].id)).returning();
      } else {
        result = await db.insert(role_permissions).values({
          companyId, role, module, canView, canCreate, canEdit, canDelete, canApprove
        }).returning();
      }
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save permission" });
    }
  });

  // BPMN Workflows Endpoints
  app.get("/api/bpmn/definitions", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const defs = await db.select().from(bpmn_definitions).where(eq(bpmn_definitions.companyId, companyId)).orderBy(desc(bpmn_definitions.createdAt));
      res.json(defs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch BPMN definitions" });
    }
  });

  app.post("/api/bpmn/definitions", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const { name, documentType, department, xmlData } = req.body;
      
      // Check if definition exists for this documentType
      const existing = await db.select().from(bpmn_definitions)
        .where(and(
          eq(bpmn_definitions.companyId, companyId),
          eq(bpmn_definitions.documentType, documentType)
        )).limit(1);

      let result;
      if (existing.length > 0) {
        // Update existing record
        result = await db.update(bpmn_definitions).set({
          name,
          xmlData,
          isActive: true
        }).where(eq(bpmn_definitions.id, existing[0].id)).returning();
      } else {
        // Insert new record
        result = await db.insert(bpmn_definitions).values({
          companyId,
          name,
          documentType,
          department,
          xmlData,
          isActive: true,
        }).returning();
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save BPMN definition" });
    }
  });

  // Workflow Endpoints (Legacy)
  app.get("/api/workflows", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      
      // Auto-patch broken XMLs missing BPMNDiagram
      const definitions = await db.select().from(bpmn_definitions).where(eq(bpmn_definitions.companyId, companyId)).orderBy(bpmn_definitions.createdAt);
      
      let needsRefresh = false;
      for (const def of definitions) {
        if (!def.xmlData.includes('bpmndi:BPMNDiagram')) {
          const patchedXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="Department Head">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="156" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="250" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="410" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="192" y="100" />
        <di:waypoint x="250" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="100" />
        <di:waypoint x="410" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
          await db.update(bpmn_definitions).set({ xmlData: patchedXml }).where(eq(bpmn_definitions.id, def.id));
          needsRefresh = true;
        }
      }

      if (needsRefresh) {
        const freshDefs = await db.select().from(bpmn_definitions).where(eq(bpmn_definitions.companyId, companyId)).orderBy(bpmn_definitions.createdAt);
        return res.json(freshDefs);
      }

      res.json(definitions);
    } catch (error: any) {
      console.error('GET /api/workflows error:', error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/workflows/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const workflow = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.id, parseInt(req.params.id)), eq(bpmn_definitions.companyId, companyId)));
      if (workflow.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(workflow[0]);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  app.delete("/api/workflows/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      await db.delete(bpmn_definitions).where(and(eq(bpmn_definitions.id, parseInt(req.params.id)), eq(bpmn_definitions.companyId, companyId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  // PR Endpoints
  app.get("/api/pr", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      
      const { type, mine } = req.query;

      let conditions: any[] = [eq(purchase_requisitions.companyId, companyId)];

      if (type === 'IR') {
        conditions.push(like(purchase_requisitions.prNumber, 'IR-%'));
        // Item Requisitions in User Panel are strictly scoped to the creator user
        if (mine !== 'false') {
          conditions.push(eq(purchase_requisitions.uid, req.user!.uid));
        }
      } else if (type === 'PR') {
        conditions.push(like(purchase_requisitions.prNumber, 'PR-%'));
        if (mine === 'true') {
          conditions.push(eq(purchase_requisitions.uid, req.user!.uid));
        }
      } else if (mine === 'true') {
        conditions.push(eq(purchase_requisitions.uid, req.user!.uid));
      }
      
      const prs = await db.select().from(purchase_requisitions).where(and(...conditions)).orderBy(desc(purchase_requisitions.createdAt));
      const allItems = await db.select().from(pr_items);
      const allApprovals = await db.select().from(pr_approvals);
      const allInventoryItems = await db.select().from(inventory_items);
      
      const prsWithItems = prs.map((pr: any) => {
        // Sort approvals by createdAt to maintain historical order
        const prApprovals = allApprovals
          .filter((a: any) => a.prId === pr.id)
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
        return {
          ...pr,
          items: allItems.filter((i: any) => i.prId === pr.id).map(i => {
            const inv = allInventoryItems.find(inv => inv.id === i.itemId);
            return {
              ...i,
              isAdminItem: inv?.isAdminItem || false,
              isItItem: inv?.isItItem || false,
            };
          }),
          approvals: prApprovals
        };
      });
      res.json(prsWithItems);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to fetch PRs" });
    }
  });
  
  app.post("/api/pr", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const { requestor, department, costCenter, priority, estimatedCost, justification, items, isDraft, documentType = 'Item Requisition', sourceIrId, procurementMethod } = req.body;
      
      const isPR = documentType === 'Purchase Request' || documentType === 'Purchase Requisition';
      const targetDocType = isPR ? 'Purchase Requisition' : 'Item Requisition';
      const approvalTitle = isPR ? "Purchase Requisition Approval Required" : "Item Requisition Approval Required";
      const createdTitle = isPR ? "Purchase Requisition Created" : "Item Requisition Created";
      const defaultLink = isPR ? "/purchase-requisition" : "/item-requisition";

      const prefix = isPR ? 'PR' : 'IR';
      const prNumber = `${prefix}-${Date.now()}`;
      
      const requesterUser = await db.select({ branchId: users.branchId }).from(users).where(eq(users.uid, req.user.uid)).limit(1);
      const requesterBranchId = requesterUser[0]?.branchId || undefined;

      const prResult = await db.insert(purchase_requisitions).values({
        companyId,
        prNumber,
        requestor,
        department,
        costCenter,
        priority,
        estimatedCost: estimatedCost.toString(),
        justification,
        status: isDraft ? "Draft" : "Pending Approval",
        sourceIrId: sourceIrId || null,
        procurementMethod: procurementMethod || null,
        uid: req.user.uid,
      }).returning();
      
      const newPrId = prResult[0].id;
      
      // Insert PR items
      if (items && items.length > 0) {
        const insertItems = items.map((item: any) => ({
          prId: newPrId,
          itemId: item.itemId || null,
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          uom: item.uom,
          estimatedPrice: item.estimatedPrice?.toString() || null,
        }));
        await db.insert(pr_items).values(insertItems);
      }
      
      // Setup Approvals based on workflow only if NOT draft
      if (!isDraft) {
        // Fetch dynamic BPMN definition for targetDocType
        let defs = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, targetDocType), eq(bpmn_definitions.isActive, true)));
        
        let approvalsToInsert: any[] = [];
        
        if (defs.length > 0) {
          const xmlData = defs[0].xmlData;
          
          // Use dynamic BPMN parsing with context
          const context = {
            amount: Number(estimatedCost) || 0,
            department: department
          };
          const path = evaluateWorkflowPath(xmlData, context);
          
          let stepOrder = 1;
          for (const task of path) {
            approvalsToInsert.push({
              prId: newPrId,
              stepOrder: stepOrder++,
              roleRequired: task.assigneeValue,
              assigneeType: task.assigneeType,
              assigneeValue: task.assigneeValue,
              status: 'Pending'
            });
          }
        } else {
          // Legacy Fallback if no BPMN exists
          const workflows = await db.select().from(approval_workflows).where(and(eq(approval_workflows.department, department), eq(approval_workflows.companyId, companyId)));
          let defaultWorkflows = workflows;
          if (workflows.length === 0) {
            defaultWorkflows = await db.select().from(approval_workflows).where(and(eq(approval_workflows.department, 'Global'), eq(approval_workflows.companyId, companyId)));
          }
          if (defaultWorkflows.length > 0) {
            approvalsToInsert = defaultWorkflows.map(wf => ({
              prId: newPrId,
              stepOrder: wf.stepOrder,
              roleRequired: wf.roleRequired,
              status: 'Pending'
            }));
          }
        }
        
        if (approvalsToInsert.length > 0) {
          await db.insert(pr_approvals).values(approvalsToInsert);
          const firstStep = approvalsToInsert.find(a => a.stepOrder === 1);
          if (firstStep) {
            await notifyApprovers(companyId, firstStep.assigneeType || 'Role', firstStep.assigneeValue || firstStep.roleRequired, department, approvalTitle, `Request ${prNumber} requires your approval.`, "ACTION", "/inbox", "PR", newPrId, requesterBranchId);
          }
        } else {
          await notifyApprovers(companyId, 'Role', 'Admin', department, createdTitle, `Request ${prNumber} has been submitted with no approvals required.`, "INFO", defaultLink, undefined, undefined, requesterBranchId);
        }
      }

      res.json(prResult[0]);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to create PR" });
    }
  });

  app.put("/api/pr/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const prId = parseInt(req.params.id);
      const { department, costCenter, priority, estimatedCost, justification, items, isDraft } = req.body;

      // Verify PR exists and is Draft
      const existingPr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, prId));
      if (existingPr.length === 0) return res.status(404).json({ error: "Not found" });
      if (existingPr[0].status !== "Draft") {
        return res.status(400).json({ error: "Only Draft requisitions can be edited" });
      }

      const newStatus = isDraft ? "Draft" : "Pending Approval";

      const prResult = await db.update(purchase_requisitions).set({
        department,
        costCenter,
        priority,
        estimatedCost: estimatedCost.toString(),
        justification,
        status: newStatus,
      }).where(eq(purchase_requisitions.id, prId)).returning();

      // Replace items
      await db.delete(pr_items).where(eq(pr_items.prId, prId));
      if (items && items.length > 0) {
        const insertItems = items.map((item: any) => ({
          prId,
          itemId: item.itemId || null,
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          uom: item.uom,
          estimatedPrice: item.estimatedPrice?.toString() || null,
        }));
        await db.insert(pr_items).values(insertItems);
      }

      // Setup Approvals if transitioning to Pending Approval
      if (!isDraft) {
        // Clear only pending approvals, keep historical ones
        await db.delete(pr_approvals).where(and(eq(pr_approvals.prId, prId), eq(pr_approvals.status, 'Pending')));

        const isPR = req.body.documentType ? (req.body.documentType === 'Purchase Request' || req.body.documentType === 'Purchase Requisition') : existingPr[0].prNumber?.startsWith('PR-');
        const targetDocType = isPR ? 'Purchase Requisition' : 'Item Requisition';
        const approvalTitle = isPR ? "Purchase Requisition Approval Required" : "Item Requisition Approval Required";
        const createdTitle = isPR ? "Purchase Requisition Created" : "Item Requisition Created";
        const defaultLink = isPR ? "/purchase-requisition" : "/item-requisition";

        // Fetch dynamic BPMN definition for targetDocType
        let defs = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, targetDocType), eq(bpmn_definitions.isActive, true)));
        
        let approvalsToInsert: any[] = [];
        
        if (defs.length > 0) {
          const xmlData = defs[0].xmlData;
          
          const context = {
            amount: Number(estimatedCost) || 0,
            department: department
          };
          const path = evaluateWorkflowPath(xmlData, context);
          
          let stepOrder = 1;
          for (const task of path) {
            approvalsToInsert.push({
              prId: prId,
              stepOrder: stepOrder++,
              roleRequired: task.assigneeValue,
              assigneeType: task.assigneeType,
              assigneeValue: task.assigneeValue,
              status: 'Pending'
            });
          }
        } else {
          // Legacy Fallback
          const workflows = await db.select().from(approval_workflows).where(and(eq(approval_workflows.department, department), eq(approval_workflows.companyId, companyId)));
          let defaultWorkflows = workflows;
          if (workflows.length === 0) {
            defaultWorkflows = await db.select().from(approval_workflows).where(and(eq(approval_workflows.department, 'Global'), eq(approval_workflows.companyId, companyId)));
          }
          if (defaultWorkflows.length > 0) {
            approvalsToInsert = defaultWorkflows.map(wf => ({
              prId: prId,
              stepOrder: wf.stepOrder,
              roleRequired: wf.roleRequired,
              status: 'Pending'
            }));
          }
        }
        
        const requesterUser = await db.select({ branchId: users.branchId }).from(users).where(eq(users.uid, existingPr[0].uid)).limit(1);
        const requesterBranchId = requesterUser[0]?.branchId || undefined;

        if (approvalsToInsert.length > 0) {
          await db.insert(pr_approvals).values(approvalsToInsert);
          const firstStep = approvalsToInsert.find(a => a.stepOrder === 1);
          if (firstStep) {
            await notifyApprovers(companyId, firstStep.assigneeType || 'Role', firstStep.assigneeValue || firstStep.roleRequired, department, approvalTitle, `Request ${existingPr[0].prNumber} requires your approval.`, "ACTION", "/inbox", "PR", prId, requesterBranchId);
          }
        } else {
          await notifyApprovers(companyId, 'Role', 'Admin', department, createdTitle, `Request ${existingPr[0].prNumber} has been submitted with no approvals required.`, "INFO", defaultLink, undefined, undefined, requesterBranchId);
        }
      }

      res.json(prResult[0]);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to update PR" });
    }
  });

  // PR Approval Endpoints
  app.get("/api/pr/approvals", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const prs = await db.select().from(purchase_requisitions).where(and(
        inArray(purchase_requisitions.status, ['Pending Approval', 'Draft', 'Approved']),
        ne(purchase_requisitions.deliveryStatus, 'Fully Delivered'),
        eq(purchase_requisitions.companyId, companyId)
      )).orderBy(desc(purchase_requisitions.createdAt));
      const allItems = await db.select().from(pr_items);
      const allApprovals = await db.select().from(pr_approvals);
      const allInventory = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));
      
      const dbUser = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const userRole = dbUser[0]?.role;
      const isSuperAdmin = userRole === 'Super Admin';

      // Get branch IDs for warehouses managed by this user (to filter Approved requisitions for fulfillment)
      const managedWhs = await db.select().from(warehouse_managers)
        .where(eq(warehouse_managers.userId, req.user!.uid));
      const managedWhIds = managedWhs.map(m => m.warehouseId);
      let managedBranchIds: number[] = [];
      if (managedWhIds.length > 0) {
        const whs = await db.select().from(warehouses)
          .where(inArray(warehouses.id, managedWhIds));
        managedBranchIds = [...new Set(whs.map(w => w.branchId))];
      }

      // Fetch all users to map creators to their branch
      const creators = await db.select().from(users).where(eq(users.companyId, companyId));

      let prsWithDetails = prs
        .map(pr => {
          const creator = creators.find(u => u.uid === pr.uid);
          const isBranchManager = creator?.branchId !== null && creator?.branchId !== undefined && managedBranchIds.includes(creator.branchId);
          const canFulfill = isSuperAdmin || (pr.status === 'Approved' && isBranchManager);

          return {
            ...pr,
            canFulfill,
            items: allItems.filter(i => i.prId === pr.id).map(i => {
               const inv = allInventory.find(inv => inv.id === i.itemId);
               return {
                 ...i,
                 availableStock: inv?.quantityInStock || 0,
                 isAdminItem: inv?.isAdminItem || false,
                 isItItem: inv?.isItItem || false,
               };
            }),
            approvals: allApprovals.filter(a => a.prId === pr.id).sort((a, b) => a.stepOrder - b.stepOrder)
          };
        })
        .filter(pr => {
          if (pr.status === 'Draft') {
            return pr.approvals.some((a: any) => a.status === 'Review');
          }
          return true;
        });

      res.json(prsWithDetails);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to fetch PR approvals" });
    }
  });

  app.post("/api/pr/approvals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const prId = parseInt(req.params.id);
      const { status, comments } = req.body; // 'Approved' or 'Rejected'

      // Find PR
      const existingPr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, prId));
      if (existingPr.length === 0) return res.status(404).json({ error: "Not found" });

      // Find pending approval step
      const approvals = await db.select().from(pr_approvals).where(eq(pr_approvals.prId, prId)).orderBy(pr_approvals.stepOrder);
      const pendingStep = approvals.find(a => a.status === 'Pending');

      if (!pendingStep) {
        return res.status(400).json({ error: "No pending approvals for this PR" });
      }

      const dbUser = await db.select().from(users).where(eq(users.uid, req.user.uid));
      const userRole = dbUser[0]?.role;
      
      let isAuthorized = false;
      if (userRole === 'Super Admin') {
        isAuthorized = true;
      } else {
        const roleReq = pendingStep.roleRequired;
        if (roleReq === 'Department Head' || roleReq.includes('Department')) {
          // Verify they are the manager of the PR's department
          const allDepts = await db.select().from(departments).where(eq(departments.companyId, existingPr[0].companyId));
          const prDept = allDepts.find(d => d.name === existingPr[0].department);
          if (prDept && prDept.managerUid === req.user.uid) {
            isAuthorized = true;
          }
        } else {
          // Global role or Designation fallback
          if (userRole === roleReq || dbUser[0]?.designation === roleReq) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: "You do not have permission to approve this step" });
      }

      // Update approval step
      await db.update(pr_approvals).set({
        status,
        comments,
        approvedBy: req.user.uid,
        updatedAt: new Date()
      }).where(eq(pr_approvals.id, pendingStep.id));

      // Mark ALL pending inbox tasks for this PR as Completed
      await db.update(inbox_tasks).set({
        status: 'Completed',
        actionResult: status,
        updatedAt: new Date()
      }).where(and(
        eq(inbox_tasks.referenceType, 'PR'),
        eq(inbox_tasks.referenceId, prId),
        eq(inbox_tasks.status, 'Pending')
      ));

      if (status === 'Rejected') {
        // Entire PR is rejected
        await db.update(purchase_requisitions).set({ status: 'Rejected' }).where(eq(purchase_requisitions.id, prId));
        await notifyUser(existingPr[0].uid, "PR Rejected", `Your PR ${existingPr[0].prNumber} has been rejected.`, "WARNING", "/item-requisition");
      } else if (status === 'Review') {
        // PR status goes back to Draft so it can be edited
        await db.update(purchase_requisitions).set({ status: 'Draft' }).where(eq(purchase_requisitions.id, prId));
        // Clear ONLY remaining pending approvals, keep historical ones
        await db.delete(pr_approvals).where(and(eq(pr_approvals.prId, prId), eq(pr_approvals.status, 'Pending')));
        
        await notifyUser(existingPr[0].uid, "PR Revision Required", `Your PR ${existingPr[0].prNumber} has been sent back for review. Comment: ${comments}`, "INFO", "/item-requisition");
      } else if (status === 'Approved') {
        // Check if there are any remaining pending steps
        const remainingSteps = approvals.filter(a => a.id !== pendingStep.id && a.status === 'Pending');
        if (remainingSteps.length === 0) {
          // All steps approved
          await db.update(purchase_requisitions).set({ status: 'Approved' }).where(eq(purchase_requisitions.id, prId));
          await notifyUser(existingPr[0].uid, "PR Approved", `Your PR ${existingPr[0].prNumber} has been fully approved!`, "SUCCESS", "/item-requisition");
        } else {
          // Notify next approver
          const nextStep = remainingSteps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
          const prCreator = await db.select({ branchId: users.branchId }).from(users).where(eq(users.uid, existingPr[0].uid)).limit(1);
          const prCreatorBranchId = prCreator[0]?.branchId || undefined;
          await notifyApprovers(existingPr[0].companyId, nextStep.assigneeType || 'Role', nextStep.assigneeValue || nextStep.roleRequired, existingPr[0].department, "PR Approval Required", `PR ${existingPr[0].prNumber} requires your approval.`, "ACTION", "/inbox", "PR", prId, prCreatorBranchId);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to update PR approval" });
    }
  });

  app.post("/api/pr/fulfill/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const prId = parseInt(req.params.id);
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "No company context" });
      
      const { items, warehouseId } = req.body;
      
      const existingPr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, prId));
      if (existingPr.length === 0) return res.status(404).json({ error: "Not found" });

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      const isAdminUser = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';
      
      let prToCreateItems = [];
      const allPrItems = await db.select().from(pr_items).where(eq(pr_items.prId, prId));

      // Pre-validation: Check stock availability & Authorization
      for (const item of items) {
        if (item.issueQuantity > 0 && item.itemId) {
          if (!warehouseId) {
             return res.status(400).json({ error: "Warehouse must be selected to issue items." });
          }
          
          const invItem = await db.select().from(inventory_items).where(eq(inventory_items.id, item.itemId));
          if (invItem.length === 0) {
            return res.status(400).json({ error: `Item not found in inventory: ${item.itemName}` });
          }

          // Authorization
          if (!isAdminUser && dbUser) {
            const managerResult = await db.select().from(warehouse_managers).where(and(
              eq(warehouse_managers.userId, dbUser.uid),
              eq(warehouse_managers.warehouseId, Number(warehouseId))
            ));
            
            if (managerResult.length === 0) {
              return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse." });
            }
            
            let hasAccess = false;
            for (const m of managerResult) {
              if (m.itemType === 'Both') { hasAccess = true; break; }
              if (invItem[0].isAdminItem && m.itemType === 'Admin') { hasAccess = true; break; }
              if (invItem[0].isItItem && m.itemType === 'IT') { hasAccess = true; break; }
            }
            if (!hasAccess) {
              return res.status(403).json({ error: `Forbidden: You do not have permission to issue ${invItem[0].name}` });
            }
          }

          // Check warehouse-specific stock
          const whStock = await db.select().from(warehouse_stock).where(and(
            eq(warehouse_stock.itemId, item.itemId),
            eq(warehouse_stock.warehouseId, Number(warehouseId))
          ));
          const availableStock = whStock.length > 0 ? (whStock[0].quantity || 0) : 0;

          if (availableStock < item.issueQuantity) {
            return res.status(400).json({ error: `Insufficient stock for ${item.itemName} in selected warehouse. Available: ${availableStock}` });
          }
        }
      }
      
      // Process each item
      for (const item of items) {
        if (item.issueQuantity > 0 && item.itemId) {
          const invItem = await db.select().from(inventory_items).where(eq(inventory_items.id, item.itemId));
          if (invItem.length > 0) {
            // Deduct from global
            const newStock = (invItem[0].quantityInStock || 0) - item.issueQuantity;
            await db.update(inventory_items).set({ quantityInStock: newStock }).where(eq(inventory_items.id, item.itemId));
            
            // Deduct from warehouse_stock
            const whStock = await db.select().from(warehouse_stock).where(and(
              eq(warehouse_stock.itemId, item.itemId),
              eq(warehouse_stock.warehouseId, Number(warehouseId))
            ));
            if (whStock.length > 0) {
                const newWhStock = (whStock[0].quantity || 0) - item.issueQuantity;
                await db.update(warehouse_stock).set({ quantity: newWhStock }).where(eq(warehouse_stock.id, whStock[0].id));
            }
            
            // Record transaction
            await db.insert(stock_transactions).values({
              companyId,
              itemId: item.itemId,
              transactionType: 'Issue',
              quantity: item.issueQuantity,
              warehouseId: Number(warehouseId),
              referenceId: existingPr[0].prNumber,
              performedBy: req.user.uid,
            });
            
            // Update global ledger
            const ledger = await db.select().from(global_stock_ledger).where(eq(global_stock_ledger.itemId, item.itemId));
            if (ledger.length > 0) {
              const newTotalOut = (ledger[0].totalStockOut || 0) + item.issueQuantity;
              const newClosing = (ledger[0].closingBalance || 0) - item.issueQuantity;
              await db.update(global_stock_ledger).set({ totalStockOut: newTotalOut, closingBalance: newClosing, lastUpdated: new Date() }).where(eq(global_stock_ledger.id, ledger[0].id));
            }
          }
        }
        
        // Update deliveredQuantity in pr_items
        if (item.id && item.issueQuantity > 0) {
          const prItem = allPrItems.find(i => i.id === item.id);
          if (prItem) {
            const newDelivered = (prItem.deliveredQuantity || 0) + item.issueQuantity;
            await db.update(pr_items).set({ deliveredQuantity: newDelivered }).where(eq(pr_items.id, item.id));
          }
        }
        
        if (item.prQuantity > 0) {
          prToCreateItems.push(item);
          if (item.id) {
            const prItem = allPrItems.find(i => i.id === item.id);
            if (prItem) {
              const newPrQty = (prItem.prCreatedQuantity || 0) + item.prQuantity;
              await db.update(pr_items).set({ prCreatedQuantity: newPrQty }).where(eq(pr_items.id, item.id));
            }
          }
        }
      }
      
      // Re-evaluate if all items are fully resolved (either delivered or new PR created)
      const updatedPrItems = await db.select().from(pr_items).where(eq(pr_items.prId, prId));
      let allFulfilled = true;
      for (const prItem of updatedPrItems) {
        if ((prItem.deliveredQuantity || 0) + (prItem.prCreatedQuantity || 0) < prItem.quantity) {
          allFulfilled = false;
        }
      }
      
      let prCreated = false;
      if (prToCreateItems.length > 0) {
        prCreated = true;
        const prCountRes = await db.select({ count: sql`count(*)` }).from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
        const prCount = Number(prCountRes[0].count) + 1;
        const newPrNumber = `PR-${Date.now()}`;
        
        const newPr = await db.insert(purchase_requisitions).values({
          companyId,
          prNumber: newPrNumber,
          requestor: existingPr[0].requestor,
          uid: existingPr[0].uid,
          department: existingPr[0].department,
          costCenter: existingPr[0].costCenter,
          priority: existingPr[0].priority,
          estimatedCost: "0",
          justification: `Auto-generated for remaining quantities from ${existingPr[0].prNumber}`,
          sourceIrId: existingPr[0].sourceIrId || existingPr[0].id,
          status: 'Draft',
          deliveryStatus: 'Not Delivered',
          requiredDate: existingPr[0].requiredDate
        }).returning();
        
        const newPrId = newPr[0].id;
        const insertItems = prToCreateItems.map((i: any) => ({
          prId: newPrId,
          itemId: i.itemId,
          itemName: i.itemName,
          category: i.category,
          quantity: i.prQuantity,
          uom: i.uom,
          estimatedPrice: "0",
          deliveredQuantity: 0
        }));
        await db.insert(pr_items).values(insertItems);
      }
      
      // Update original PR deliveryStatus
      let finalStatus = allFulfilled ? 'Fully Delivered' : 'Partially Delivered';
      if (prCreated && !allFulfilled) {
        finalStatus = 'PR Created';
      }
      await db.update(purchase_requisitions).set({ deliveryStatus: finalStatus }).where(eq(purchase_requisitions.id, prId));
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to fulfill PR" });
    }
  });


  // Vendor Endpoints
  app.get("/api/vendors", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      await db.update(vendors).set({ companyId }).where(isNull(vendors.companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      res.json(allVendors);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "Company ID not resolved" });
      
      const { name, bin, tin, contactPerson, email, phone, bankName, branchName, accountName, accountNumber, routingNumber } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }

      const [newVendor] = await db.insert(vendors).values({
        companyId,
        name,
        bin,
        tin,
        contactPerson,
        email,
        phone,
        bankName,
        branchName,
        accountName,
        accountNumber,
        routingNumber,
        status: 'Active',
        rating: '0.0'
      }).returning();

      res.status(201).json(newVendor);
    } catch (error: any) {
      console.error("Failed to create vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "Company ID not resolved" });
      
      const vendorId = parseInt(req.params.id);
      const { name, bin, tin, contactPerson, email, phone, bankName, branchName, accountName, accountNumber, routingNumber, status } = req.body;

      const [updatedVendor] = await db.update(vendors)
        .set({
          name,
          bin,
          tin,
          contactPerson,
          email,
          phone,
          bankName,
          branchName,
          accountName,
          accountNumber,
          routingNumber,
          ...(status ? { status } : {})
        })
        .where(and(eq(vendors.id, vendorId), eq(vendors.companyId, companyId)))
        .returning();

      if (!updatedVendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      res.json(updatedVendor);
    } catch (error: any) {
      console.error("Failed to update vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // ==========================================
  // RFQ Endpoints
  // ==========================================
  app.get("/api/rfq", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      await db.update(rfq).set({ companyId }).where(isNull(rfq.companyId));
      const rfqs = await db.select().from(rfq).where(eq(rfq.companyId, companyId)).orderBy(desc(rfq.createdAt));
      const allPrs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const allRfqVendors = await db.select().from(rfq_vendors);
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));

      const rfqsWithDetails = rfqs.map(r => {
        const pr = allPrs.find(p => p.id === r.prId);
        const invitedVendorIds = allRfqVendors.filter(rv => rv.rfqId === r.id).map(rv => rv.vendorId);
        const invitedVendors = allVendors.filter(v => invitedVendorIds.includes(v.id));
        return {
          ...r,
          prNumber: pr?.prNumber || '',
          requestor: pr?.requestor || '',
          department: pr?.department || '',
          invitedVendors
        };
      });
      res.json(rfqsWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch RFQs" });
    }
  });

  app.post("/api/rfq", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const { prId, deadline, vendorIds } = req.body;
      const rfqNumber = `RFQ-${Date.now()}`;
      
      const rfqResult = await db.insert(rfq).values({
        companyId,
        rfqNumber,
        prId,
        deadline: deadline ? new Date(deadline) : null,
        status: 'Open'
      }).returning();

      const newRfqId = rfqResult[0].id;

      if (vendorIds && vendorIds.length > 0) {
        const insertVendors = vendorIds.map((vId: number) => ({
          rfqId: newRfqId,
          vendorId: vId
        }));
        await db.insert(rfq_vendors).values(insertVendors);
      }

      res.json(rfqResult[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create RFQ" });
    }
  });

  // ==========================================
  // Quotation Endpoints
  // ==========================================
  app.get("/api/rfq/:rfqId/quotations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rfqId = parseInt(req.params.rfqId);
      const quotes = await db.select().from(quotations).where(eq(quotations.rfqId, rfqId));
      res.json(quotes);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.post("/api/rfq/:rfqId/quotations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rfqId = parseInt(req.params.rfqId);
      const { vendorId, quotes } = req.body;
      
      const prItems = await db.select().from(pr_items);
      const rfqRec = await db.select().from(rfq).where(eq(rfq.id, rfqId));
      if (rfqRec.length === 0) return res.status(404).json({ error: "RFQ not found" });

      const prItemIdsForPr = prItems.filter(i => i.prId === rfqRec[0].prId).map(i => i.id);
      
      for (const prItemId of prItemIdsForPr) {
        await db.delete(quotations).where(
          and(
            eq(quotations.rfqId, rfqId),
            eq(quotations.vendorId, vendorId),
            eq(quotations.prItemId, prItemId)
          )
        );
      }

      if (quotes && quotes.length > 0) {
        const insertQuotes = quotes.map((q: any) => ({
          rfqId,
          vendorId,
          prItemId: q.prItemId,
          quotedPrice: (q.quotedPrice || 0).toString(),
          deliveryDays: q.deliveryDays || null,
          remarks: q.remarks || null,
          attachmentUrl: q.attachmentUrl || null,
          vatPercent: (q.vatPercent ?? 0).toString(),
          vatAmount: (q.vatAmount ?? 0).toString(),
          taxPercent: (q.taxPercent ?? 0).toString(),
          taxAmount: (q.taxAmount ?? 0).toString(),
          totalAmount: (q.totalAmount ?? 0).toString(),
          description: q.description || null,
        }));
        await db.insert(quotations).values(insertQuotes);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save quotations" });
    }
  });

  // ==========================================
  // Comparative Statement (CS) Endpoints
  // ==========================================
  app.get("/api/cs", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      await db.update(comparative_statements).set({ companyId }).where(isNull(comparative_statements.companyId));
      const css = await db.select().from(comparative_statements).where(eq(comparative_statements.companyId, companyId)).orderBy(desc(comparative_statements.createdAt));
      const allRfqs = await db.select().from(rfq).where(eq(rfq.companyId, companyId));
      const allPrs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      const allEvaluations = await db.select().from(vendor_evaluations).where(eq(vendor_evaluations.companyId, companyId));

      const cssWithDetails = css.map(c => {
        const r = allRfqs.find(rf => rf.id === c.rfqId);
        const pr = allPrs.find(p => p.id === c.prId);
        const vendor = allVendors.find(v => v.id === c.selectedVendorId);
        const evals = allEvaluations.filter(e => e.csId === c.id);
        return {
          ...c,
          rfqNumber: r?.rfqNumber || '',
          prNumber: pr?.prNumber || '',
          selectedVendorName: vendor?.name || '',
          isEvaluated: evals.length > 0 || c.evaluationType === 'Quick Evaluation',
          evaluations: evals
        };
      });
      res.json(cssWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch CS records" });
    }
  });

  app.get("/api/cs/:id/evaluations", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const csId = parseInt(req.params.id);
      const evals = await db.select().from(vendor_evaluations).where(and(eq(vendor_evaluations.companyId, companyId), eq(vendor_evaluations.csId, csId)));
      res.json(evals);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  });

  async function ensureWorkOrderForCs(companyId: string, csId: number, createdByUid?: string) {
    try {
      const existing = await db.select().from(work_orders).where(eq(work_orders.csId, csId));
      if (existing.length > 0) return existing[0];

      const csList = await db.select().from(comparative_statements).where(eq(comparative_statements.id, csId));
      if (csList.length === 0) return null;
      const cs = csList[0];

      if (!cs.selectedVendorId) return null;

      const vendorList = await db.select().from(vendors).where(eq(vendors.id, cs.selectedVendorId));
      const vendor = vendorList[0];

      const prList = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, cs.prId));
      const pr = prList[0];

      let poId: number | null = null;
      let poNumber = '';
      const existingPos = await db.select().from(purchase_orders).where(eq(purchase_orders.csId, csId));
      if (existingPos.length > 0) {
        poId = existingPos[0].id;
        poNumber = existingPos[0].poNumber;
      } else {
        poNumber = `PO-${Date.now()}`;
        const newPo = await db.insert(purchase_orders).values({
          companyId,
          poNumber,
          prId: cs.prId,
          csId: cs.id,
          vendorId: cs.selectedVendorId,
          totalAmount: cs.totalAmount || '0',
          status: 'Approved',
          createdBy: createdByUid || cs.createdBy
        }).returning();
        poId = newPo[0].id;

        const quotes = await db.select().from(quotations).where(and(eq(quotations.rfqId, cs.rfqId), eq(quotations.vendorId, cs.selectedVendorId)));
        const prItems = await db.select().from(pr_items).where(eq(pr_items.prId, cs.prId));
        if (prItems.length > 0) {
          const poItemsData = prItems.map(item => {
            const q = quotes.find(quote => quote.prItemId === item.id);
            return {
              poId: newPo[0].id,
              itemName: item.itemName,
              quantity: item.quantity,
              uom: item.uom || 'Pcs',
              unitPrice: (q?.quotedPrice || item.estimatedPrice || '0').toString()
            };
          });
          await db.insert(po_items).values(poItemsData);
        }
      }

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const woNumber = `SLI/HQ/${String(csId).padStart(3, '0')}/${year}/${month}`;

      const defaultTerms = [
        `As per your Quotation e-mail dated ${cs.createdAt ? new Date(cs.createdAt).toLocaleDateString() : 'N/A'} Ref No. UTCEH-IDB-${cs.id}`,
        "Payment shall be made after 15 days of receipt of all materials in good condition.",
        `Please submit the bill along with the Purchase Order (${poNumber}) number clearly mentioned on both the invoice and delivery challan for processing of payment.`,
        "Price is VAT & TAX included.",
        "Price includes delivery charges.",
        "Please provide invoice with Mushak 6.3.",
        "Shanta Life reserves the full right to cancel or amend the Work Order at any stage, as deemed necessary."
      ];

      const woResult = await db.insert(work_orders).values({
        companyId,
        woNumber,
        csId: cs.id,
        poId,
        prId: cs.prId,
        vendorId: cs.selectedVendorId,
        subject: `Work Order for ${pr?.prNumber || 'Procurement Items'}`,
        attnPerson: vendor?.contactPerson || vendor?.name || 'Authorized Representative',
        quotationRefNo: `UTCEH-IDB-${cs.id}`,
        quotationDate: cs.createdAt || new Date(),
        deliveryAddress: 'Shanta Western Tower, Level 10, 186, Bir Uttam Mir Shawkat Sarak, Tejgaon, Dhaka - 1208, Bangladesh',
        officeContactName: pr?.requestor || 'Mr. Mamun Hossain',
        officeContactPhone: '+8801332544756',
        officeContactEmail: 'mamun.hossain@shantalife.com',
        totalAmount: cs.totalAmount || '0',
        vatAmount: '0',
        taxAmount: '0',
        grandTotal: cs.totalAmount || '0',
        termsConditions: defaultTerms,
        status: 'Pending Signed Upload',
        createdBy: createdByUid || cs.createdBy
      }).returning();

      return woResult[0];
    } catch (err) {
      console.error("Error in ensureWorkOrderForCs:", err);
      return null;
    }
  }

  async function ensureWorkOrdersForTenant(companyId: string) {
    try {
      const csList = await db.select().from(comparative_statements).where(eq(comparative_statements.companyId, companyId));
      for (const cs of csList) {
        if (cs.selectedVendorId) {
          await ensureWorkOrderForCs(companyId, cs.id);
        }
      }

      const poList = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      for (const po of poList) {
        if (po.vendorId) {
          const existingWo = await db.select().from(work_orders).where(eq(work_orders.poId, po.id));
          if (existingWo.length === 0) {
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            const woNumber = `SLI/HQ/${String(po.id).padStart(3, '0')}/${year}/${month}`;
            const vendorList = await db.select().from(vendors).where(eq(vendors.id, po.vendorId));
            const vendor = vendorList[0];

            const defaultTerms = [
              `As per your Quotation Ref No. PO-${po.poNumber}`,
              "Payment shall be made after 15 days of receipt of all materials in good condition.",
              `Please submit the bill along with the Purchase Order (${po.poNumber}) number clearly mentioned on both the invoice and delivery challan for processing of payment.`,
              "Price is VAT & TAX included.",
              "Price includes delivery charges.",
              "Please provide invoice with Mushak 6.3.",
              "Shanta Life reserves the full right to cancel or amend the Work Order at any stage, as deemed necessary."
            ];

            await db.insert(work_orders).values({
              companyId,
              woNumber,
              csId: po.csId || null,
              poId: po.id,
              prId: po.prId || null,
              vendorId: po.vendorId,
              subject: `Work Order for Purchase Order ${po.poNumber}`,
              attnPerson: vendor?.contactPerson || vendor?.name || 'Authorized Representative',
              quotationRefNo: `PO-${po.poNumber}`,
              quotationDate: po.createdAt || new Date(),
              deliveryAddress: 'Shanta Western Tower, Level 10, 186, Bir Uttam Mir Shawkat Sarak, Tejgaon, Dhaka - 1208, Bangladesh',
              officeContactName: 'Mr. Mamun Hossain',
              officeContactPhone: '+8801332544756',
              officeContactEmail: 'mamun.hossain@shantalife.com',
              totalAmount: po.totalAmount || '0',
              vatAmount: '0',
              taxAmount: '0',
              grandTotal: po.totalAmount || '0',
              termsConditions: defaultTerms,
              status: 'Pending Signed Upload',
              createdBy: po.createdBy
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in ensureWorkOrdersForTenant:", err);
    }
  }

  // --- Work Orders Endpoints ---
  app.get("/api/work-orders", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      
      await ensureWorkOrdersForTenant(companyId);

      const wos = await db.select().from(work_orders).where(eq(work_orders.companyId, companyId)).orderBy(desc(work_orders.createdAt));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      const allPrs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const allPos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const allCss = await db.select().from(comparative_statements).where(eq(comparative_statements.companyId, companyId));

      const enrichedWos = wos.map(wo => {
        const vendor = allVendors.find(v => v.id === wo.vendorId);
        const pr = allPrs.find(p => p.id === wo.prId);
        const po = allPos.find(p => p.id === wo.poId);
        const cs = allCss.find(c => c.id === wo.csId);
        return {
          ...wo,
          vendorName: vendor?.name || 'N/A',
          vendorPhone: vendor?.phone || '',
          vendorEmail: vendor?.email || '',
          vendorAddress: 'Tejgaon, Dhaka - 1208, Bangladesh',
          prNumber: pr?.prNumber || '',
          poNumber: po?.poNumber || '',
          csNumber: cs?.csNumber || ''
        };
      });

      res.json(enrichedWos);
    } catch (error: any) {
      console.error("Failed to fetch work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  app.get("/api/work-orders/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const id = parseInt(req.params.id);
      const woList = await db.select().from(work_orders).where(and(eq(work_orders.id, id), eq(work_orders.companyId, companyId)));
      if (woList.length === 0) return res.status(404).json({ error: "Work order not found" });

      const wo = woList[0];
      const vendorList = await db.select().from(vendors).where(eq(vendors.id, wo.vendorId));
      const prList = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, wo.prId));
      const poList = wo.poId ? await db.select().from(purchase_orders).where(eq(purchase_orders.id, wo.poId)) : [];
      const itemsList = wo.poId ? await db.select().from(po_items).where(eq(po_items.poId, wo.poId)) : [];

      res.json({
        ...wo,
        vendor: vendorList[0] || null,
        pr: prList[0] || null,
        po: poList[0] || null,
        items: itemsList
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch work order detail" });
    }
  });

  app.put("/api/work-orders/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const id = parseInt(req.params.id);
      const {
        subject, attnPerson, quotationRefNo, quotationDate,
        deliveryAddress, officeContactName, officeContactPhone, officeContactEmail,
        termsConditions, vatAmount, taxAmount, grandTotal
      } = req.body;

      const updated = await db.update(work_orders).set({
        subject,
        attnPerson,
        quotationRefNo,
        quotationDate: quotationDate ? new Date(quotationDate) : undefined,
        deliveryAddress,
        officeContactName,
        officeContactPhone,
        officeContactEmail,
        termsConditions,
        vatAmount: vatAmount ? vatAmount.toString() : undefined,
        taxAmount: taxAmount ? taxAmount.toString() : undefined,
        grandTotal: grandTotal ? grandTotal.toString() : undefined,
      }).where(and(eq(work_orders.id, id), eq(work_orders.companyId, companyId))).returning();

      res.json(updated[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  });

  app.post("/api/work-orders/:id/upload-signed", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      const { signedFileUrl } = req.body;

      if (!signedFileUrl) {
        return res.status(400).json({ error: "Signed document attachment URL is required" });
      }

      const updated = await db.update(work_orders).set({
        signedFileUrl,
        signedUploadedAt: new Date(),
        signedUploadedBy: req.user.uid,
        status: 'Signed & Active'
      }).where(and(eq(work_orders.id, id), eq(work_orders.companyId, companyId))).returning();

      res.json(updated[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to upload signed work order" });
    }
  });

  app.post("/api/cs", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { rfqId, prId, selectedVendorId, justification, totalAmount, evaluationType = 'Full Evaluation', vendorScores, submitForApproval = false } = req.body;
      const csNumber = `CS-${Date.now()}`;

      const csResult = await db.insert(comparative_statements).values({
        companyId,
        csNumber,
        rfqId,
        prId,
        selectedVendorId,
        justification,
        totalAmount: totalAmount ? totalAmount.toString() : null,
        evaluationType,
        status: 'Draft',
        createdBy: req.user.uid
      }).returning();

      const newCs = csResult[0];

      await db.update(rfq).set({ status: 'Closed' }).where(eq(rfq.id, rfqId));

      if (vendorScores && vendorScores.length > 0) {
        const insertData = vendorScores.map((vs: any) => ({
          companyId,
          csId: newCs.id,
          vendorId: vs.vendorId,
          criteriaName: vs.criteriaName,
          weight: vs.weight.toString(),
          score: vs.score.toString(),
          remarks: vs.remarks
        }));
        await db.insert(vendor_evaluations).values(insertData);
      }

      if (submitForApproval) {
        if (evaluationType !== 'Quick Evaluation' && (!vendorScores || vendorScores.length === 0)) {
          return res.status(400).json({ error: "Cannot submit CS for approval. Vendor evaluation must be completed first." });
        }
        const pr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, prId));
        const dept = pr[0]?.department || 'Global';
        const amount = Number(totalAmount) || 0;

        await db.update(comparative_statements).set({ status: 'Pending Approval' }).where(eq(comparative_statements.id, newCs.id));

        let defs = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'CS Evaluation'), eq(bpmn_definitions.isActive, true)));
        
        let approvalsToInsert: any[] = [];
        if (defs.length > 0) {
          const xmlData = defs[0].xmlData;
          const context = { amount, department: dept };
          const path = evaluateWorkflowPath(xmlData, context);
          
          let stepOrder = 1;
          for (const task of path) {
            approvalsToInsert.push({
              companyId,
              documentType: 'CS',
              documentId: newCs.id,
              stepOrder: stepOrder++,
              roleRequired: task.assigneeValue,
              assigneeType: task.assigneeType,
              assigneeValue: task.assigneeValue,
              status: 'Pending'
            });
          }
        }

        if (approvalsToInsert.length > 0) {
          await db.insert(document_approvals).values(approvalsToInsert);
          const firstStep = approvalsToInsert.find(a => a.stepOrder === 1);
          if (firstStep) {
            await notifyApprovers(companyId, firstStep.assigneeType || 'Role', firstStep.assigneeValue || firstStep.roleRequired, dept, "CS Evaluation Approval Required", `CS ${csNumber} requires your approval.`, "ACTION", "/inbox", "CS", newCs.id);
          }
        } else {
          await db.update(comparative_statements).set({ status: 'Approved' }).where(eq(comparative_statements.id, newCs.id));
          await ensureWorkOrderForCs(companyId, newCs.id, req.user.uid);
        }
      }

      res.json(newCs);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create CS" });
    }
  });

  app.post("/api/cs/:id/evaluate", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const csId = parseInt(req.params.id);
      const { vendorScores, totalAmount, selectedVendorId } = req.body; // vendorScores is array of { vendorId, criteriaName, weight, score, remarks }

      // Update CS with total amount and selected vendor
      await db.update(comparative_statements).set({ 
        totalAmount: totalAmount ? totalAmount.toString() : null,
        selectedVendorId: selectedVendorId || null
      }).where(eq(comparative_statements.id, csId));

      // Clear existing evaluations for this CS
      await db.delete(vendor_evaluations).where(eq(vendor_evaluations.csId, csId));

      // Insert new evaluations
      if (vendorScores && vendorScores.length > 0) {
        const insertData = vendorScores.map((vs: any) => ({
          companyId,
          csId,
          vendorId: vs.vendorId,
          criteriaName: vs.criteriaName,
          weight: vs.weight.toString(),
          score: vs.score.toString(),
          remarks: vs.remarks
        }));
        await db.insert(vendor_evaluations).values(insertData);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save CS evaluation" });
    }
  });

  app.post("/api/cs/:id/submit-approval", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const csId = parseInt(req.params.id);

      const csRecord = await db.select().from(comparative_statements).where(eq(comparative_statements.id, csId));
      if (csRecord.length === 0) return res.status(404).json({ error: "CS not found" });

      // Enforce vendor evaluation check before submitting for approval
      const evals = await db.select().from(vendor_evaluations).where(eq(vendor_evaluations.csId, csId));
      if (evals.length === 0 && csRecord[0].evaluationType !== 'Quick Evaluation') {
        return res.status(400).json({ error: "Cannot submit CS for approval. Vendor evaluation must be completed first." });
      }

      const pr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, csRecord[0].prId));
      const dept = pr[0]?.department || 'Global';
      const amount = Number(csRecord[0].totalAmount) || 0;

      // Update status to Pending Approval
      await db.update(comparative_statements).set({ status: 'Pending Approval' }).where(eq(comparative_statements.id, csId));

      let defs = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'CS Evaluation'), eq(bpmn_definitions.isActive, true)));
      
      let approvalsToInsert: any[] = [];
      if (defs.length > 0) {
        const xmlData = defs[0].xmlData;
        const context = { amount, department: dept };
        const path = evaluateWorkflowPath(xmlData, context);
        
        let stepOrder = 1;
        for (const task of path) {
          approvalsToInsert.push({
            companyId,
            documentType: 'CS',
            documentId: csId,
            stepOrder: stepOrder++,
            roleRequired: task.assigneeValue,
            assigneeType: task.assigneeType,
            assigneeValue: task.assigneeValue,
            status: 'Pending'
          });
        }
      }

      if (approvalsToInsert.length > 0) {
        await db.insert(document_approvals).values(approvalsToInsert);
        const firstStep = approvalsToInsert.find(a => a.stepOrder === 1);
        if (firstStep) {
          await notifyApprovers(companyId, firstStep.assigneeType || 'Role', firstStep.assigneeValue || firstStep.roleRequired, dept, "CS Evaluation Approval Required", `CS ${csRecord[0].csNumber} requires your approval.`, "ACTION", "/inbox", "CS", csId);
        }
      } else {
        await db.update(comparative_statements).set({ status: 'Approved' }).where(eq(comparative_statements.id, csId));
        await ensureWorkOrderForCs(companyId, csId, req.user.uid);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit CS for approval" });
    }
  });

  app.post("/api/cs/approvals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const csId = parseInt(req.params.id);
      const { status, comments } = req.body; 

      const existingCs = await db.select().from(comparative_statements).where(eq(comparative_statements.id, csId));
      if (existingCs.length === 0) return res.status(404).json({ error: "Not found" });

      const pr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, existingCs[0].prId));

      const approvals = await db.select().from(document_approvals).where(and(eq(document_approvals.documentId, csId), eq(document_approvals.documentType, 'CS'))).orderBy(document_approvals.stepOrder);
      const pendingStep = approvals.find(a => a.status === 'Pending');

      if (!pendingStep) {
        return res.status(400).json({ error: "No pending approvals for this CS" });
      }

      const dbUser = await db.select().from(users).where(eq(users.uid, req.user.uid));
      const userRole = dbUser[0]?.role;
      
      let isAuthorized = false;
      if (userRole === 'Super Admin') {
        isAuthorized = true;
      } else {
        const roleReq = pendingStep.roleRequired;
        if (userRole === roleReq || dbUser[0]?.designation === roleReq) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: "You do not have permission to approve this step" });
      }

      await db.update(document_approvals).set({
        status,
        comments,
        approvedBy: req.user.uid,
        updatedAt: new Date()
      }).where(eq(document_approvals.id, pendingStep.id));

      await db.update(inbox_tasks).set({
        status: 'Completed',
        actionResult: status,
        updatedAt: new Date()
      }).where(and(
        eq(inbox_tasks.referenceType, 'CS'),
        eq(inbox_tasks.referenceId, csId),
        eq(inbox_tasks.status, 'Pending')
      ));

      if (status === 'Rejected') {
        await db.update(comparative_statements).set({ status: 'Rejected' }).where(eq(comparative_statements.id, csId));
      } else if (status === 'Review') {
        await db.update(comparative_statements).set({ status: 'Draft' }).where(eq(comparative_statements.id, csId));
        await db.delete(document_approvals).where(and(eq(document_approvals.documentId, csId), eq(document_approvals.documentType, 'CS'), eq(document_approvals.status, 'Pending')));
      } else if (status === 'Approved') {
        const remainingSteps = approvals.filter(a => a.id !== pendingStep.id && a.status === 'Pending');
        if (remainingSteps.length === 0) {
          await db.update(comparative_statements).set({ status: 'Approved' }).where(eq(comparative_statements.id, csId));
          await ensureWorkOrderForCs(existingCs[0].companyId!, csId, req.user.uid);
        } else {
          const nextStep = remainingSteps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
          await notifyApprovers(existingCs[0].companyId!, nextStep.assigneeType || 'Role', nextStep.assigneeValue || nextStep.roleRequired, pr[0]?.department || 'Global', "CS Evaluation Approval Required", `CS ${existingCs[0].csNumber} requires your approval.`, "ACTION", "/inbox", "CS", csId);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to update CS approval" });
    }
  });

  // ==========================================
  // Purchase Order (PO) Endpoints
  // ==========================================
  app.get("/api/purchase", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      await db.update(purchase_orders).set({ companyId }).where(isNull(purchase_orders.companyId));
      const pos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId)).orderBy(desc(purchase_orders.createdAt));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      const allPrs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const allPoItems = await db.select().from(po_items);

      const posWithDetails = pos.map(p => {
        const vendor = allVendors.find(v => v.id === p.vendorId);
        const pr = allPrs.find(prItem => prItem.id === p.prId);
        return {
          ...p,
          vendorName: vendor?.name || '',
          prNumber: pr?.prNumber || '',
          items: allPoItems.filter(i => i.poId === p.id)
        };
      });
      res.json(posWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch POs" });
    }
  });

  app.post("/api/purchase", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const { prId, csId, vendorId, totalAmount, items, paymentTerms, warrantyTerms, deliverySchedule } = req.body;
      const poNumber = `PO-${Date.now()}`;

      const poResult = await db.insert(purchase_orders).values({
        companyId,
        poNumber,
        prId,
        csId: csId || null,
        vendorId,
        totalAmount: totalAmount.toString(),
        paymentTerms: paymentTerms || null,
        warrantyTerms: warrantyTerms || null,
        deliverySchedule: deliverySchedule || null,
        createdBy: req.user.uid,
        status: 'Pending Approval'
      }).returning();

      const newPoId = poResult[0].id;

      if (items && items.length > 0) {
        const insertItems = items.map((i: any) => ({
          poId: newPoId,
          itemName: i.itemName,
          quantity: i.quantity,
          uom: i.uom,
          unitPrice: i.unitPrice.toString()
        }));
        await db.insert(po_items).values(insertItems);
      }

      const pr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, prId));
      const dept = pr[0]?.department || 'Global';

      const workflows = await db.select().from(approval_workflows).where(
        and(
          eq(approval_workflows.documentType, 'PO'),
          eq(approval_workflows.department, dept),
          eq(approval_workflows.companyId, companyId)
        )
      );
      let defaultWorkflows = workflows;
      if (workflows.length === 0) {
        defaultWorkflows = await db.select().from(approval_workflows).where(
          and(
            eq(approval_workflows.documentType, 'PO'),
            eq(approval_workflows.department, 'Global'),
            eq(approval_workflows.companyId, companyId)
          )
        );
      }

      if (defaultWorkflows.length > 0) {
        const approvals = defaultWorkflows.map(wf => ({
          companyId,
          documentType: 'PO',
          documentId: newPoId,
          stepOrder: wf.stepOrder,
          roleRequired: wf.roleRequired,
          status: 'Pending'
        }));
        await db.insert(document_approvals).values(approvals);
        
        const firstStep = defaultWorkflows.find(wf => wf.stepOrder === 1);
        if (firstStep) {
          await notifyUsersByRole(companyId, firstStep.roleRequired, "PO Approval Required", `PO ${poNumber} requires your approval.`, "ACTION", "/purchase");
        }
      } else {
        await db.update(purchase_orders).set({ status: 'Approved' }).where(eq(purchase_orders.id, newPoId));
        await notifyUsersByRole(companyId, 'Admin', "PO Created", `PO ${poNumber} was created and auto-approved.`, "INFO", "/purchase");
      }

      res.json(poResult[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create PO" });
    }
  });



  // ==========================================
  // Goods Receive Note (GRN) & QC Endpoints
  // ==========================================
  app.get("/api/grn", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      await db.update(grn).set({ companyId }).where(isNull(grn.companyId));
      const grns = await db.select().from(grn).where(eq(grn.companyId, companyId)).orderBy(desc(grn.createdAt));
      const allPos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      const allGrnItems = await db.select().from(grn_items);
      const allPoItems = await db.select().from(po_items);
      const allQcInspections = await db.select().from(qc_inspections);

      const grnsWithDetails = grns.map(g => {
        const po = allPos.find(p => p.id === g.poId);
        const vendor = po ? allVendors.find(v => v.id === po.vendorId) : null;
        return {
          ...g,
          poNumber: po?.poNumber || '',
          vendorName: vendor?.name || '',
          items: allGrnItems.filter(i => i.grnId === g.id).map(i => {
            const poItem = allPoItems.find(pi => pi.id === i.poItemId);
            const itemQcs = allQcInspections.filter(q => q.grnItemId === i.id);
            const latestQc = itemQcs.length > 0 ? itemQcs[itemQcs.length - 1] : null;
            return {
              ...i,
              itemName: poItem?.itemName || `Item ID #${i.poItemId}`,
              category: (poItem as any)?.category || 'General',
              uom: poItem?.uom || 'Pcs',
              unitPrice: poItem?.unitPrice || 0,
              passedQty: latestQc ? latestQc.passedQty : (i.status === 'Passed' ? i.quantityReceived : 0),
              failedQty: latestQc ? latestQc.failedQty : (i.status === 'Failed' || i.status === 'Hold' ? i.quantityReceived : 0),
              remarks: latestQc?.remarks || ''
            };
          })
        };
      });
      res.json(grnsWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch GRNs" });
    }
  });

  app.post("/api/grn", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { poId, items, warehouseId } = req.body;
      const grnNumber = `GRN-${Date.now()}`;

      // Check if PO has a signed Work Order uploaded
      const woRecords = await db.select().from(work_orders).where(eq(work_orders.poId, poId));
      if (woRecords.length > 0) {
        const wo = woRecords[0];
        if (!wo.signedFileUrl || wo.status !== 'Signed & Active') {
          return res.status(400).json({ error: "Cannot create GRN: Signed Work Order must be uploaded first for this Purchase Order." });
        }
      }

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      if (dbUser) {
        const poItemRecords = await db.select().from(po_items).where(eq(po_items.poId, poId));
        const itemNames = poItemRecords.map(pi => pi.itemName);
        let itemIds: number[] = [];
        if (itemNames.length > 0) {
          const invItems = await db.select().from(inventory_items).where(inArray(inventory_items.name, itemNames));
          itemIds = invItems.map(i => i.id);
        }
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, Number(warehouseId), itemIds);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse or an item type within." });
        }
      }

      const grnResult = await db.insert(grn).values({
        companyId,
        grnNumber,
        poId,
        warehouseId,
        receivedBy: req.user.uid,
        status: 'Pending QC'
      }).returning();

      const newGrnId = grnResult[0].id;

      if (items && items.length > 0) {
        const insertItems = items.map((i: any) => ({
          grnId: newGrnId,
          poItemId: i.poItemId,
          quantityReceived: i.quantityReceived,
          status: 'Pending QC'
        }));
        await db.insert(grn_items).values(insertItems);
      }

      await db.update(purchase_orders).set({ status: 'Delivered' }).where(eq(purchase_orders.id, poId));
      await notifyUsersByRole(companyId, 'Admin', "GRN Created", `Items received for PO via ${grnNumber}.`, "INFO", "/grn");


      res.json(grnResult[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create GRN" });
    }
  });

  app.post("/api/qc/inspection", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { grnItemId, inspectedQty, passedQty, failedQty, remarks } = req.body;

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      if (dbUser) {
        const grnItemResult = await db.select().from(grn_items).where(eq(grn_items.id, grnItemId)).limit(1);
        if (!grnItemResult.length) return res.status(404).json({ error: "GRN Item not found" });
        const parentGrn = await db.select().from(grn).where(eq(grn.id, grnItemResult[0].grnId)).limit(1);
        
        const poItemResult = await db.select().from(po_items).where(eq(po_items.id, grnItemResult[0].poItemId)).limit(1);
        let itemIds: number[] = [];
        if (poItemResult.length > 0) {
           const invItems = await db.select().from(inventory_items).where(eq(inventory_items.name, poItemResult[0].itemName)).limit(1);
           if (invItems.length > 0) itemIds.push(invItems[0].id);
        }
        
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, parentGrn[0].warehouseId!, itemIds);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse or item type." });
        }
      }

      // Check previous passed qty for this GRN Item to calculate incremental stock addition
      const previousQcList = await db.select().from(qc_inspections).where(eq(qc_inspections.grnItemId, grnItemId));
      const previousPassedTotal = previousQcList.length > 0 ? previousQcList[previousQcList.length - 1].passedQty : 0;

      const qcResult = await db.insert(qc_inspections).values({
        grnItemId,
        inspectedQty,
        passedQty,
        failedQty,
        remarks,
        inspectedBy: req.user.uid
      }).returning();

      let status = 'Passed';
      if (passedQty > 0 && failedQty > 0) {
        status = 'Partial';
      } else if (failedQty > 0 && passedQty === 0) {
        status = 'Hold';
      }
      await db.update(grn_items).set({ status }).where(eq(grn_items.id, grnItemId));

      // Calculate incremental stock for newly passed items
      const newlyPassed = Math.max(0, passedQty - previousPassedTotal);

      const grnItem = await db.select().from(grn_items).where(eq(grn_items.id, grnItemId));
      const grnId = grnItem[0].grnId;
      const grnRecord = await db.select().from(grn).where(eq(grn.id, grnId));
      const warehouseId = grnRecord[0]?.warehouseId;
      const companyId = grnRecord[0]?.companyId;

      if (newlyPassed > 0 && warehouseId && companyId) {
        const poItem = await db.select().from(po_items).where(eq(po_items.id, grnItem[0].poItemId));
        if (poItem.length > 0) {
          const targetName = poItem[0].itemName.trim();
          let inv = await db.select().from(inventory_items).where(
            and(
              eq(inventory_items.companyId, companyId),
              ilike(inventory_items.name, targetName)
            )
          );

          let invItemId: number;
          if (inv.length === 0) {
            const [newInv] = await db.insert(inventory_items).values({
              companyId,
              itemCode: `ITEM-${Date.now()}`,
              name: poItem[0].itemName,
              category: (poItem[0] as any)?.category || 'General',
              uom: poItem[0].uom || 'Pcs',
              basePrice: String(poItem[0].unitPrice || '0.00'),
              quantityInStock: newlyPassed
            }).returning();
            invItemId = newInv.id;
          } else {
            invItemId = inv[0].id;
            // 1. Update Global quantityInStock & Weighted Average Costing (WAC)
            const currentQty = inv[0].quantityInStock || 0;
            const currentPrice = Number(inv[0].basePrice || 0);
            const incomingPrice = Number(poItem[0].unitPrice || 0);
            const newTotalQty = currentQty + newlyPassed;
            const newWac = newTotalQty > 0 ? ((currentQty * currentPrice) + (newlyPassed * incomingPrice)) / newTotalQty : currentPrice;

            await db.update(inventory_items).set({
              quantityInStock: newTotalQty,
              basePrice: String(newWac.toFixed(2))
            }).where(eq(inventory_items.id, invItemId));
          }

          // 2. Update warehouse_stock
          const ws = await db.select().from(warehouse_stock).where(and(eq(warehouse_stock.warehouseId, warehouseId), eq(warehouse_stock.itemId, invItemId)));
          if (ws.length > 0) {
            await db.update(warehouse_stock).set({
              quantity: (ws[0].quantity || 0) + newlyPassed,
              lastUpdated: new Date()
            }).where(eq(warehouse_stock.id, ws[0].id));
          } else {
            await db.insert(warehouse_stock).values({
              companyId,
              warehouseId,
              itemId: invItemId,
              quantity: newlyPassed,
              lastUpdated: new Date()
            });
          }

            // 3. Update global_stock_ledger
            const gsl = await db.select().from(global_stock_ledger).where(and(eq(global_stock_ledger.companyId, companyId), eq(global_stock_ledger.itemId, invItemId)));
            if (gsl.length > 0) {
              await db.update(global_stock_ledger).set({
                totalStockIn: (gsl[0].totalStockIn || 0) + newlyPassed,
                closingBalance: (gsl[0].closingBalance || 0) + newlyPassed,
                lastUpdated: new Date()
              }).where(eq(global_stock_ledger.id, gsl[0].id));
            } else {
              await db.insert(global_stock_ledger).values({
                companyId,
                itemId: invItemId,
                openingBalance: 0,
                totalStockIn: newlyPassed,
                totalStockOut: 0,
                closingBalance: newlyPassed,
                lastUpdated: new Date()
              });
            }

            // 4. Auto-register Fixed Asset & Auto-assign Custodian if item is a Fixed Asset
            try {
              const currentInv = await db.select().from(inventory_items).where(eq(inventory_items.id, invItemId)).limit(1);
              const isFixed = currentInv[0]?.isFixedAsset || (poItem[0] as any)?.category === 'Fixed Asset' || (currentInv[0]?.category && currentInv[0].category.toLowerCase().includes('asset'));

              if (isFixed) {
                // Trace PO -> PR -> Original IR / Requester
                let requesterUid: string | null = null;
                const parentPo = await db.select().from(purchase_orders).where(eq(purchase_orders.id, poItem[0].poId)).limit(1);
                if (parentPo.length > 0 && parentPo[0].prId) {
                  const parentPr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, parentPo[0].prId)).limit(1);
                  if (parentPr.length > 0) {
                    if (parentPr[0].sourceIrId) {
                      const originalIr = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.id, parentPr[0].sourceIrId)).limit(1);
                      if (originalIr.length > 0) {
                        requesterUid = originalIr[0].uid || (originalIr[0] as any).createdBy || null;
                      }
                    }
                    if (!requesterUid) {
                      requesterUid = parentPr[0].uid || (parentPr[0] as any).createdBy || null;
                    }
                  }
                }

                // Match or find asset category
                let assetCatId = currentInv[0]?.assetCategoryId;
                if (!assetCatId) {
                  const catList = await db.select().from(asset_categories).where(eq(asset_categories.companyId, companyId)).limit(1);
                  if (catList.length > 0) {
                    assetCatId = catList[0].id;
                  }
                }

                if (assetCatId) {
                  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  for (let k = 0; k < newlyPassed; k++) {
                    const assetCode = `AST-IR-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
                    await db.insert(assets).values({
                      companyId,
                      assetCode,
                      name: poItem[0].itemName.trim(),
                      categoryId: assetCatId,
                      warehouseId,
                      custodianUid: requesterUid || null,
                      acquisitionDate: new Date(),
                      acquisitionCost: String(poItem[0].unitPrice || '0.00'),
                      salvageValue: '0.00',
                      currentBookValue: String(poItem[0].unitPrice || '0.00'),
                      status: 'Active',
                      sourceType: 'GRN',
                      sourceGrnId: grnId,
                      createdByUid: req.user.uid
                    });
                  }
                }
              }
            } catch (assetErr) {
              console.error('Error auto-registering asset on QC pass:', assetErr);
            }
          }
        }

      // Auto-create vendor_quality_metrics for supplier quality rating
      try {
        const poItem = await db.select().from(po_items).where(eq(po_items.id, grnItem[0].poItemId));
        if (poItem.length > 0) {
          const parentPo = await db.select().from(purchase_orders).where(eq(purchase_orders.id, poItem[0].poId)).limit(1);
          if (parentPo.length > 0 && parentPo[0].vendorId) {
            const vendorId = parentPo[0].vendorId;
            const evalMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

            const existingMetric = await db.select().from(vendor_quality_metrics).where(and(
              eq(vendor_quality_metrics.vendorId, vendorId),
              eq(vendor_quality_metrics.evaluationMonth, evalMonth)
            )).limit(1);

            const recCount = (existingMetric[0]?.totalItemsReceived || 0) + inspectedQty;
            const rejCount = (existingMetric[0]?.totalItemsRejected || 0) + failedQty;
            const rejRate = recCount > 0 ? ((rejCount / recCount) * 100).toFixed(2) : '0';
            const qScore = recCount > 0 ? (((recCount - rejCount) / recCount) * 10).toFixed(2) : '10';

            if (existingMetric.length > 0) {
              await db.update(vendor_quality_metrics).set({
                totalItemsReceived: recCount,
                totalItemsRejected: rejCount,
                rejectionRate: String(rejRate),
                qualityScore: String(qScore),
                updatedAt: new Date()
              }).where(eq(vendor_quality_metrics.id, existingMetric[0].id));
            } else {
              await db.insert(vendor_quality_metrics).values({
                companyId,
                vendorId,
                evaluationMonth: evalMonth,
                totalItemsReceived: recCount,
                totalItemsRejected: rejCount,
                rejectionRate: String(rejRate),
                qualityScore: String(qScore)
              });
            }
          }
        }
      } catch (vmErr) {
        console.warn('Vendor quality metric update skipped:', vmErr);
      }

      // Auto-create rejected_item_dispositions record for failed items
      if (failedQty > 0 && companyId) {
        try {
          const poItem = await db.select().from(po_items).where(eq(po_items.id, grnItem[0].poItemId));
          const itemName = poItem.length > 0 ? poItem[0].itemName : 'Rejected Item';
          let itemId: number | null = null;
          if (poItem.length > 0) {
            const invItem = await db.select().from(inventory_items).where(and(eq(inventory_items.companyId, companyId), ilike(inventory_items.name, poItem[0].itemName.trim()))).limit(1);
            if (invItem.length > 0) itemId = invItem[0].id;
          }

          await db.insert(rejected_item_dispositions).values({
            companyId,
            qcInspectionId: qcResult[0].id,
            grnId,
            grnItemId,
            itemId,
            itemName,
            quantityRejected: failedQty,
            status: 'Pending',
            notes: remarks || 'Created from QC inspection failure',
          });
        } catch (rejErr) {
          console.warn('Rejected item record auto-creation failed:', rejErr);
        }
      }

      // Auto-create Asset from GRN if item is a Fixed Asset
      if (newlyPassed > 0 && companyId) {
        try {
          const poItemData = await db.select().from(po_items).where(eq(po_items.id, grnItem[0].poItemId));
          if (poItemData.length > 0) {
            const invItem = await db.select().from(inventory_items).where(
              and(eq(inventory_items.companyId, companyId), ilike(inventory_items.name, poItemData[0].itemName.trim()))
            ).limit(1);

            const isFixed = invItem.length > 0 && (invItem[0].isFixedAsset || (invItem[0] as any).category === 'Fixed Asset');
            if (isFixed) {
              const existingAsset = await db.select().from(assets).where(
                and(eq(assets.sourceGrnId, grnId), eq(assets.companyId, companyId), eq(assets.name, poItemData[0].itemName))
              ).limit(1);

              if (existingAsset.length === 0) {
                const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
                const assetCount = await db.select({ count: sql`count(*)` }).from(assets).where(eq(assets.companyId, companyId));
                const seq = String(Number(assetCount[0].count) + 1).padStart(4, '0');

                let categoryId: string;
                if (invItem.length > 0 && invItem[0].assetCategoryId) {
                  categoryId = invItem[0].assetCategoryId;
                } else {
                  const existingCategories = await db.select().from(asset_categories).where(eq(asset_categories.companyId, companyId)).limit(1);
                  if (existingCategories.length > 0) {
                    categoryId = existingCategories[0].id;
                  } else {
                    const [newDefaultCat] = await db.insert(asset_categories).values({
                      companyId,
                      name: 'General Fixed Assets',
                      code: 'CAT-GEN',
                      defaultDepreciationMethod: 'Straight Line',
                      defaultUsefulLifeMonths: 36,
                      status: 'Active'
                    }).returning();
                    categoryId = newDefaultCat.id;
                  }
                }

                await db.insert(assets).values({
                  companyId,
                  assetCode: `AST-${dateStr}-${seq}`,
                  name: poItemData[0].itemName,
                  categoryId,
                  sourceType: 'GRN',
                  sourceGrnId: grnId,
                  acquisitionDate: new Date(),
                  acquisitionCost: String(poItemData[0].unitPrice || '0.00'),
                  currentBookValue: String(poItemData[0].unitPrice || '0.00'),
                  status: 'Draft',
                  createdByUid: req.user!.uid,
                });
              }
            }
          }
        } catch (assetErr) {
          console.warn('Auto-asset creation from GRN failed (non-fatal):', assetErr);
        }
      }

      // Update parent GRN status if all items completed
      const allGrnItems = await db.select().from(grn_items).where(eq(grn_items.grnId, grnId));
      const pendingQcItems = allGrnItems.filter(i => i.status === 'Pending QC');
      if (pendingQcItems.length === 0) {
        await db.update(grn).set({ status: 'QC Completed' }).where(eq(grn.id, grnId));
      }

      res.json(qcResult[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit QC inspection" });
    }
  });

  // ==========================================
  // Invoices & Payments Endpoints
  // ==========================================
  app.get("/api/invoices", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      
      const allInvs = await db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt));
      
      const allPos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const allGrns = await db.select().from(grn).where(eq(grn.companyId, companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));

      const invsWithDetails = allInvs.map(i => {
        const po = allPos.find(p => p.id === i.poId);
        const gr = allGrns.find(g => g.id === i.grnId);
        const vendor = po ? allVendors.find(v => v.id === po.vendorId) : null;
        return {
          ...i,
          poNumber: po?.poNumber || '',
          grnNumber: gr?.grnNumber || '',
          vendorName: vendor?.name || ''
        };
      });
      res.json(invsWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const { grnId } = req.body;
      if (!grnId) return res.status(400).json({ error: "GRN ID is required" });

      const grnRecord = await db.select().from(grn).where(and(eq(grn.id, grnId), eq(grn.companyId, companyId))).limit(1);
      if (grnRecord.length === 0) return res.status(404).json({ error: "GRN not found" });

      const poId = grnRecord[0].poId;
      
      // Calculate amount based on received items and PO prices
      const grnItemsList = await db.select().from(grn_items).where(eq(grn_items.grnId, grnId));
      const poItemsList = await db.select().from(po_items).where(eq(po_items.poId, poId));
      
      let totalAmount = 0;
      for (const item of grnItemsList) {
         const poItem = poItemsList.find(p => p.id === item.poItemId);
         if (poItem) {
            totalAmount += (item.quantityReceived || 0) * Number(poItem.unitPrice || 0);
         }
      }

      const invoiceNumber = `INV-${grnRecord[0].grnNumber}`;

      // Check if invoice already exists
      const existing = await db.select().from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.grnId, grnId)));
      if (existing.length > 0) {
        return res.status(400).json({ error: "Invoice already exists for this GRN" });
      }

      const invResult = await db.insert(invoices).values({
        companyId,
        invoiceNumber,
        poId,
        grnId,
        amount: totalAmount.toString(),
        invoiceDate: new Date(),
        status: 'Pending',
        matchingNotes: 'Auto-generated from GRN'
      }).returning();

      await notifyUsersByRole(companyId, 'Admin', "Invoice Generated", `Invoice ${invoiceNumber} has been generated for GRN.`, "INFO", "/invoices-payments");

      res.json(invResult[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.post("/api/invoices/:id/pay", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const invId = parseInt(req.params.id);
      
      const invRecord = await db.select().from(invoices).where(and(eq(invoices.id, invId), eq(invoices.companyId, companyId))).limit(1);
      if (invRecord.length === 0) return res.status(404).json({ error: "Invoice not found" });
      if (invRecord[0].status === 'Paid') return res.status(400).json({ error: "Invoice is already paid" });

      const paymentNumber = `PAY-${Date.now()}`;

      await db.insert(payments).values({
        companyId,
        paymentNumber,
        invoiceId: invId,
        paymentMethod: 'Manual',
        amountPaid: invRecord[0].amount.toString(),
        status: 'Completed'
      });

      await db.update(invoices).set({ status: 'Paid' }).where(eq(invoices.id, invId));
      
      await notifyUsersByRole(companyId, 'Admin', "Invoice Paid", `Invoice ${invRecord[0].invoiceNumber} has been manually marked as paid.`, "SUCCESS", "/invoices-payments");

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to pay invoice" });
    }
  });

  app.get("/api/payments", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      
      const allPayments = await db.select().from(payments).where(eq(payments.companyId, companyId)).orderBy(desc(payments.paidAt));
      const allInvoices = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
      const allPos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));

      const payWithDetails = allPayments.map(p => {
        const inv = allInvoices.find(i => i.id === p.invoiceId);
        const po = inv ? allPos.find(poItem => poItem.id === inv.poId) : null;
        const v = po ? allVendors.find(vItem => vItem.id === po.vendorId) : null;
        return {
          ...p,
          invoiceNumber: inv?.invoiceNumber || '',
          vendorName: v?.name || '',
          poNumber: po?.poNumber || ''
        };
      });
      res.json(payWithDetails);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // ==========================================
  // Generalized Document Approvals APIs
  // ==========================================
  app.get("/api/document-approvals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const approvalsList = await db.select().from(document_approvals).orderBy(desc(document_approvals.createdAt));
      res.json(approvalsList);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch document approvals" });
    }
  });

  app.post("/api/document-approvals/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const approvalId = parseInt(req.params.id);
      const { status, comments } = req.body;

      const appRecord = await db.select().from(document_approvals).where(eq(document_approvals.id, approvalId));
      if (appRecord.length === 0) return res.status(404).json({ error: "Approval record not found" });

      const { documentType, documentId, stepOrder, roleRequired } = appRecord[0];

      const dbUser = await db.select().from(users).where(eq(users.uid, req.user.uid));
      const userRole = dbUser[0]?.role;
      if (userRole !== 'Super Admin' && userRole !== roleRequired) {
        return res.status(403).json({ error: "Unauthorized role for this approval step" });
      }

      await db.update(document_approvals).set({
        status,
        comments,
        approvedBy: req.user.uid,
        updatedAt: new Date()
      }).where(eq(document_approvals.id, approvalId));

      if (status === 'Rejected') {
        if (documentType === 'CS') {
          await db.update(comparative_statements).set({ status: 'Rejected' }).where(eq(comparative_statements.id, documentId));
        } else if (documentType === 'PO') {
          await db.update(purchase_orders).set({ status: 'Rejected' }).where(eq(purchase_orders.id, documentId));
        }
      } else if (status === 'Approved') {
        const approvals = await db.select().from(document_approvals).where(
          and(
            eq(document_approvals.documentType, documentType),
            eq(document_approvals.documentId, documentId)
          )
        ).orderBy(document_approvals.stepOrder);

        const remainingPending = approvals.filter(a => a.id !== approvalId && a.status === 'Pending');
        if (remainingPending.length === 0) {
          if (documentType === 'CS') {
            await db.update(comparative_statements).set({ status: 'Approved' }).where(eq(comparative_statements.id, documentId));
          } else if (documentType === 'PO') {
            await db.update(purchase_orders).set({ status: 'Approved' }).where(eq(purchase_orders.id, documentId));
          }
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to execute approval action" });
    }
  });

  // ==========================================
  // INVENTORY & WAREHOUSE HELPER
  // ==========================================
  async function verifyWarehouseAccess(userId: string, role: string, warehouseId: number, itemIds?: number[]): Promise<boolean> {
    if (role === 'Super Admin' || role === 'Admin') return true;
    
    const managers = await db.select().from(warehouse_managers).where(and(
      eq(warehouse_managers.userId, userId),
      eq(warehouse_managers.warehouseId, warehouseId)
    ));
    
    if (managers.length === 0) return false;

    if (itemIds && itemIds.length > 0) {
      const items = await db.select().from(inventory_items).where(inArray(inventory_items.id, itemIds));
      if (items.length !== itemIds.length) return false; // Some items not found

      // Check each item against the manager's item type constraints
      for (const item of items) {
        let hasAccess = false;
        for (const m of managers) {
          if (m.itemType === 'Both') { hasAccess = true; break; }
          if (item.isAdminItem && m.itemType === 'Admin') { hasAccess = true; break; }
          if (item.isItItem && m.itemType === 'IT') { hasAccess = true; break; }
          if (!item.isAdminItem && !item.isItItem) { hasAccess = true; break; } // Standard item
        }
        if (!hasAccess) return false; // Fail early if ANY item fails check
      }
    }
    
    return true;
  }

  // Inventory Categories Endpoints
  app.get("/api/inventory/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);
      const categories = await db.select().from(item_categories).where(eq(item_categories.companyId, companyId)).orderBy(desc(item_categories.id));
      res.json(categories);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch item categories" });
    }
  });

  app.post("/api/inventory/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { name, description, status } = req.body;
      const result = await db.insert(item_categories).values({
        companyId,
        name,
        description,
        status: status || 'Active'
      }).returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create item category." });
    }
  });

  // Inventory Endpoints
  app.get("/api/inventory", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);
      const items = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId)).orderBy(desc(inventory_items.id));
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/warehouse-stock", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const stock = await db.select().from(warehouse_stock).where(eq(warehouse_stock.companyId, companyId));
      res.json(stock);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch warehouse stock" });
    }
  });

  app.post("/api/inventory", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });
      const { itemCode, name, category, uom, quantityInStock, reorderLevel, location, isFixedAsset, assetCategoryId, basePrice, isAdminItem, isItItem } = req.body;
      const result = await db.insert(inventory_items).values({
        companyId,
        itemCode,
        name,
        category,
        uom,
        quantityInStock: quantityInStock || 0,
        reorderLevel: reorderLevel || 0,
        location,
        isFixedAsset: isFixedAsset || false,
        assetCategoryId: isFixedAsset && assetCategoryId ? assetCategoryId : null,
        basePrice: basePrice || null,
        isAdminItem: isAdminItem || false,
        isItItem: isItItem || false,
      }).returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ error: "Failed to add inventory item" });
    }
  });

  // SMTP Settings Endpoints
  app.get("/api/smtp-settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const smtp = await db.select().from(smtp_settings).where(eq(smtp_settings.companyId, companyId)).limit(1);
      res.json(smtp.length > 0 ? smtp[0] : null);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch SMTP settings" });
    }
  });

  app.put("/api/smtp-settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const { host, port, secure, username, password, fromEmail, fromName } = req.body;

      const existing = await db.select().from(smtp_settings).where(eq(smtp_settings.companyId, companyId)).limit(1);
      
      if (existing.length > 0) {
        await db.update(smtp_settings).set({
          host, port: Number(port), secure, username, password, fromEmail, fromName, updatedAt: new Date()
        }).where(eq(smtp_settings.companyId, companyId));
      } else {
        await db.insert(smtp_settings).values({
          companyId, host, port: Number(port), secure, username, password, fromEmail, fromName
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save SMTP settings" });
    }
  });

  app.post("/api/smtp-settings/test", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const { host, port, secure, username, password, fromEmail, fromName } = req.body;
      const userRec = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      if (userRec.length === 0 || !userRec[0].email) {
        return res.status(400).json({ error: "Your profile is missing an email address to send the test to." });
      }

      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure,
        auth: { user: username, pass: password }
      });

      await transporter.verify();
      
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: userRec[0].email,
        subject: "SLI ERP - SMTP Test Email",
        text: "This is a test email to verify your SMTP settings.",
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "SMTP Test failed: " + error.message });
    }
  });

  // Notification Settings Endpoints
  app.get("/api/notification-settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      // NOTE: Assume resolveTenantId is accessible. Check if it is accessible. It is.
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const settings = await db.select().from(notification_settings)
        .where(eq(notification_settings.companyId, companyId));

      const mergedSettings = Object.entries(DEFAULT_NOTIFICATION_TEMPLATES).map(([actionEvent, defaultTemplate]) => {
        const override = settings.find(s => s.actionEvent === actionEvent);
        return {
          actionEvent,
          module: defaultTemplate.module,
          recipient: defaultTemplate.recipient || 'General',
          titleTemplate: override ? override.titleTemplate : defaultTemplate.titleTemplate,
          bodyTemplate: override ? override.bodyTemplate : defaultTemplate.bodyTemplate,
          isActive: override && override.isActive !== null ? override.isActive : true,
          isMailActive: override && override.isMailActive !== null ? override.isMailActive : false,
          mailSubjectTemplate: override && override.mailSubjectTemplate && override.mailSubjectTemplate !== defaultTemplate.titleTemplate ? override.mailSubjectTemplate : defaultTemplate.mailSubjectTemplate || defaultTemplate.titleTemplate,
          mailBodyTemplate: override && override.mailBodyTemplate && override.mailBodyTemplate !== defaultTemplate.bodyTemplate ? override.mailBodyTemplate : defaultTemplate.mailBodyTemplate || defaultTemplate.bodyTemplate
        };
      });

      res.json(mergedSettings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  app.put("/api/notification-settings/:actionEvent", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });

      const actionEvent = req.params.actionEvent;
      const { titleTemplate, bodyTemplate, isActive, isMailActive, mailSubjectTemplate, mailBodyTemplate } = req.body;
      const defaultTemplate = DEFAULT_NOTIFICATION_TEMPLATES[actionEvent];

      if (!defaultTemplate) return res.status(404).json({ error: "Action event not found" });

      const existing = await db.select().from(notification_settings)
        .where(and(eq(notification_settings.companyId, companyId), eq(notification_settings.actionEvent, actionEvent)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(notification_settings)
          .set({ titleTemplate, bodyTemplate, isActive, isMailActive, mailSubjectTemplate, mailBodyTemplate, updatedAt: new Date() })
          .where(and(eq(notification_settings.companyId, companyId), eq(notification_settings.actionEvent, actionEvent)));
      } else {
        await db.insert(notification_settings).values({
          companyId,
          actionEvent,
          module: defaultTemplate.module,
          titleTemplate,
          bodyTemplate,
          isActive,
          isMailActive,
          mailSubjectTemplate,
          mailBodyTemplate
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });


  // Notification Endpoints
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userNotifications = await db.select().from(notifications)
        .where(eq(notifications.userId, req.user!.uid))
        .orderBy(desc(notifications.createdAt));
      res.json(userNotifications);
    } catch (error: any) {
      console.error("Fetch notifications error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, req.user!.uid));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, parseInt(req.params.id)), eq(notifications.userId, req.user!.uid)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Dashboard Endpoints
  app.get("/api/dashboard/procurement", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const prs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const pos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const grns = await db.select().from(grn).where(eq(grn.companyId, companyId));
      const vends = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      
      const posIds = pos.map(p => p.id);
      const allInvs = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
      const invs = allInvs.filter(i => posIds.includes(i.poId));

      const invIds = invs.map(i => i.id);
      const allPays = await db.select().from(payments);
      const pays = allPays.filter(p => invIds.includes(p.invoiceId));
      
      const totalPrs = prs.length;
      const totalPos = pos.length;
      const totalVendors = vends.length;
      
      const totalSpend = pos.reduce((acc, po) => acc + parseFloat(po.totalAmount || "0"), 0);
      const totalPaid = pays.reduce((acc, p) => acc + parseFloat(p.amountPaid || "0"), 0);

      // Pending actions
      const prsPendingApproval = prs.filter(pr => pr.status === 'Pending Approval').length;
      const posPendingGrn = pos.filter(po => po.status === 'Approved' || po.status === 'Issued').length;
      const unpaidInvoices = invs.filter(inv => inv.status !== 'Paid').length;
      
      // Charts Data
      const prStatusGroups = prs.reduce((acc: any, pr) => {
        const status = pr.status || 'Draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const prStatusChartData = Object.keys(prStatusGroups).map(key => ({ name: key, value: prStatusGroups[key] }));

      const poStatusGroups = pos.reduce((acc: any, po) => {
        const status = po.status || 'Draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const poStatusChartData = Object.keys(poStatusGroups).map(key => ({ name: key, value: poStatusGroups[key] }));

      const deptGroups = prs.reduce((acc: any, pr) => {
        const dept = pr.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      const prDeptChartData = Object.keys(deptGroups).map(key => ({ name: key, prs: deptGroups[key] }));

      // Spend timeline (group POs by month created)
      const spendByMonth = pos.reduce((acc: any, po) => {
        if (!po.createdAt) return acc;
        const d = new Date(po.createdAt);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        acc[month] = (acc[month] || 0) + parseFloat(po.totalAmount || "0");
        return acc;
      }, {});
      
      const spendTimelineData = Object.keys(spendByMonth).sort().map(month => ({
        name: month,
        spend: spendByMonth[month]
      }));

      // Recent activities (take 10 recent items across all modules)
      const activities: any[] = [];
      prs.forEach(pr => activities.push({ id: pr.id, type: 'PR', ref: pr.prNumber, action: `PR Created: ${pr.status}`, date: pr.createdAt || new Date() }));
      pos.forEach(po => activities.push({ id: po.id, type: 'PO', ref: po.poNumber, action: `PO Created: ${po.status}`, date: po.createdAt || new Date() }));
      pays.forEach(p => activities.push({ id: p.id, type: 'Payment', ref: p.paymentNumber, action: `Payment Processed`, date: p.paidAt || new Date() }));
      grns.forEach(g => activities.push({ id: g.id, type: 'GRN', ref: g.grnNumber, action: `Items Received`, date: g.createdAt || new Date() }));
      
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recentActivities = activities.slice(0, 10);

      res.json({
        metrics: {
          totalPrs, totalPos, totalVendors, totalSpend, totalPaid
        },
        pendingActions: {
          prsPendingApproval, posPendingGrn, unpaidInvoices
        },
        charts: {
          prStatusChartData,
          prDeptChartData,
          poStatusChartData,
          spendTimelineData
        },
        recentActivities
      });
    } catch (error: any) {
      console.error("Dashboard DB Error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Inventory Dashboard Endpoint
  app.get("/api/dashboard/inventory", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const items = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));
      const transactions = await db.select().from(stock_transactions).where(eq(stock_transactions.companyId, companyId)).orderBy(desc(stock_transactions.createdAt));
      const allGrns = await db.select().from(grn).where(eq(grn.companyId, companyId)).orderBy(desc(grn.createdAt));
      const allPos = await db.select().from(purchase_orders).where(eq(purchase_orders.companyId, companyId));
      const allVendors = await db.select().from(vendors).where(eq(vendors.companyId, companyId));
      const allRequisitions = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));

      // Metrics
      const totalItems = items.length;
      const totalStockQty = items.reduce((sum, item) => sum + (item.quantityInStock || 0), 0);
      const lowStockItems = items.filter(item => (item.quantityInStock || 0) <= (item.reorderLevel || 0));
      const lowStockCount = lowStockItems.length;
      const totalFixedAssets = items.filter(item => item.isFixedAsset).length;
      const totalMovements = transactions.length;

      const requisitionMetrics = {
        total: allRequisitions.length,
        draft: allRequisitions.filter(r => r.status === 'Draft').length,
        pending: allRequisitions.filter(r => r.status === 'Pending').length,
        approved: allRequisitions.filter(r => r.status === 'Approved').length,
        rejected: allRequisitions.filter(r => r.status === 'Rejected').length,
        fullyDelivered: allRequisitions.filter(r => r.deliveryStatus === 'Fully Delivered').length,
        partiallyDelivered: allRequisitions.filter(r => r.deliveryStatus === 'Partially Delivered').length,
        notDelivered: allRequisitions.filter(r => r.deliveryStatus === 'Not Delivered').length,
        prCreated: allRequisitions.filter(r => r.deliveryStatus === 'PR Created').length,
      };

      // Category breakdown for Pie Chart
      const categoryGroups = items.reduce((acc: any, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = { count: 0, qty: 0 };
        acc[cat].count += 1;
        acc[cat].qty += (item.quantityInStock || 0);
        return acc;
      }, {});
      const categoryChartData = Object.keys(categoryGroups).map(key => ({
        name: key,
        count: categoryGroups[key].count,
        qty: categoryGroups[key].qty,
      }));

      // Low stock items for Bar Chart (top 10 lowest relative to reorder level)
      const lowStockChartData = items
        .filter(item => (item.reorderLevel || 0) > 0)
        .map(item => ({
          name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
          stock: item.quantityInStock || 0,
          reorderLevel: item.reorderLevel || 0,
        }))
        .sort((a, b) => (a.stock / a.reorderLevel) - (b.stock / b.reorderLevel))
        .slice(0, 10);

      // Recent GRNs with details
      const recentGrns = allGrns.slice(0, 5).map(g => {
        const po = allPos.find(p => p.id === g.poId);
        const vendor = po ? allVendors.find(v => v.id === po.vendorId) : null;
        return {
          id: g.id,
          grnNumber: g.grnNumber,
          poNumber: po?.poNumber || '',
          vendorName: vendor?.name || '',
          status: g.status,
          receivedDate: g.receivedDate,
        };
      });

      // Recent stock transactions
      const recentTransactions = transactions.slice(0, 15).map(t => {
        const item = items.find(i => i.id === t.itemId);
        return {
          id: t.id,
          itemName: item?.name || 'Unknown',
          itemCode: item?.itemCode || '',
          type: t.transactionType,
          quantity: t.quantity,
          referenceId: t.referenceId,
          createdAt: t.createdAt,
        };
      });

      // Stock movement trend by month
      const movementsByMonth = transactions.reduce((acc: any, t) => {
        if (!t.createdAt) return acc;
        const d = new Date(t.createdAt);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[month]) acc[month] = { inbound: 0, outbound: 0 };
        if (t.transactionType === 'GRN' || t.transactionType === 'Return') {
          acc[month].inbound += t.quantity;
        } else {
          acc[month].outbound += t.quantity;
        }
        return acc;
      }, {});
      const movementTrendData = Object.keys(movementsByMonth).sort().map(month => ({
        name: month,
        inbound: movementsByMonth[month].inbound,
        outbound: movementsByMonth[month].outbound,
      }));

      res.json({
        metrics: { totalItems, totalStockQty, lowStockCount, totalMovements, totalFixedAssets },
        requisitionMetrics,
        lowStockItems: lowStockItems.map(i => ({
          id: i.id,
          itemCode: i.itemCode,
          name: i.name,
          category: i.category,
          quantityInStock: i.quantityInStock,
          reorderLevel: i.reorderLevel,
          uom: i.uom,
        })),
        charts: { categoryChartData, lowStockChartData, movementTrendData },
        recentGrns,
        recentTransactions,
      });
    } catch (error: any) {
      console.error("Inventory Dashboard Error:", error);
      res.status(500).json({ error: "Failed to fetch inventory dashboard data" });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      let companyId = req.query.companyId as string;
      
      let settings = [];
      if (companyId) {
        settings = await db.select().from(system_settings).where(eq(system_settings.companyId, companyId));
      } else {
        // No companyId => return global settings (companyId IS NULL) for login page
        settings = await db.select().from(system_settings).where(isNull(system_settings.companyId));
      }
      
      const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      res.json(settingsMap);
    } catch (error: any) {
      console.warn("Error fetching settings (returning fallback):", error?.message);
      res.json({});
    }
  });

  // Global branding settings (login page logo & favicon â€” not tied to any company)
  app.get("/api/settings/global", async (_req, res) => {
    try {
      const settings = await db.select().from(system_settings).where(isNull(system_settings.companyId));
      const settingsMap = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
      // Cache for 5 minutes â€” login page branding rarely changes
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.json(settingsMap);
    } catch (error: any) {
      console.warn("Error fetching global settings (returning fallback):", error?.message);
      res.setHeader('Cache-Control', 'no-cache');
      res.json({});
    }
  });

  app.post("/api/settings/global", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getUser(req.user!.uid, req.user!.email || "");
      if (!dbUser || dbUser.role !== 'Super Admin') {
        return res.status(403).json({ error: "Only Super Admin can update global settings" });
      }

      const updates = req.body; // { key1: value1, key2: value2 }
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value !== 'string') continue;
        // Check if a global setting (companyId IS NULL) already exists for this key
        const existing = await db
          .select()
          .from(system_settings)
          .where(and(isNull(system_settings.companyId), eq(system_settings.key, key)));

        if (existing.length > 0) {
          await db
            .update(system_settings)
            .set({ value, updatedBy: req.user!.uid })
            .where(and(isNull(system_settings.companyId), eq(system_settings.key, key)));
        } else {
          await db
            .insert(system_settings)
            .values({ companyId: null as any, key, value, updatedBy: req.user!.uid });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save global settings" });
    }
  });

  app.post("/api/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getUser(req.user!.uid, req.user!.email || "");
      if (!dbUser || dbUser.role !== 'Super Admin') {
        return res.status(403).json({ error: "Only Super Admin can update settings" });
      }

      // If Super Admin passes ?companyId, use that directly (for CompanyManager editing other tenants).
      // Otherwise fall back to resolveTenantId which reads x-tenant-id header (active tenant).
      let companyId: string | undefined;
      if (req.query.companyId) {
        companyId = req.query.companyId as string;
      } else {
        companyId = await resolveTenantId(req);
      }

      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const updates = req.body; // Expecting { key1: value1, key2: value2 }
      
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value !== 'string') continue;
        const existing = await db
          .select()
          .from(system_settings)
          .where(and(eq(system_settings.companyId, companyId), eq(system_settings.key, key)));
          
        if (existing.length > 0) {
          await db
            .update(system_settings)
            .set({ value, updatedBy: req.user!.uid })
            .where(and(eq(system_settings.companyId, companyId), eq(system_settings.key, key)));
        } else {
          await db
            .insert(system_settings)
            .values({ companyId, key, value, updatedBy: req.user!.uid });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.get("/api/admin/dashboard", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      const dbUser = await getUser(req.user!.uid, req.user!.email || "");
      if (!dbUser) return res.status(403).json({ error: "Access Denied" });

      const isGSA = dbUser.role === 'Super Admin' && !dbUser.companyId;

      const counts: any = {
        users: { total: 0, active: 0, inactive: 0 },
        roles: 0,
        departments: { total: 0, active: 0, inactive: 0 },
        units: { total: 0, active: 0, inactive: 0 },
        designations: { total: 0, active: 0, inactive: 0 },
        branches: { total: 0, active: 0, inactive: 0 },
        warehouses: { total: 0, active: 0, inactive: 0 },
        companies: 0,
      };

      if (isGSA && !companyId) {
        counts.companies = Number((await db.select({ count: sql<number>`count(*)` }).from(companies))[0].count) || 0;
        // Without specific tenant context, returning global company count.
      } else if (companyId) {
        const buildStatsQuery = (table: any) => ({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${table.status} ilike 'active')`,
          inactive: sql<number>`count(*) filter (where ${table.status} ilike 'inactive')`
        });

        const [
          usersData,
          rolesData,
          departmentsData,
          unitsData,
          designationsData,
          branchesData,
          warehousesData
        ] = await Promise.all([
          db.select(buildStatsQuery(users)).from(users).where(eq(users.companyId, companyId)),
          db.select({ count: sql<number>`count(DISTINCT role)` }).from(role_permissions).where(eq(role_permissions.companyId, companyId)),
          db.select(buildStatsQuery(departments)).from(departments).where(eq(departments.companyId, companyId)),
          db.select(buildStatsQuery(units)).from(units).where(eq(units.companyId, companyId)),
          db.select(buildStatsQuery(designations)).from(designations).where(eq(designations.companyId, companyId)),
          db.select(buildStatsQuery(branches)).from(branches).where(eq(branches.companyId, companyId)),
          db.select(buildStatsQuery(warehouses)).from(warehouses).where(eq(warehouses.companyId, companyId))
        ]);

        counts.users = usersData[0] || counts.users;
        counts.roles = Number(rolesData[0]?.count) || 0;
        counts.departments = departmentsData[0] || counts.departments;
        counts.units = unitsData[0] || counts.units;
        counts.designations = designationsData[0] || counts.designations;
        counts.branches = branchesData[0] || counts.branches;
        counts.warehouses = warehousesData[0] || counts.warehouses;
      }

      res.json(counts);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  // ==========================================
  // UNITS API
  // ==========================================
  app.get("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.json([]);

      const allUnits = await db.select().from(units).where(eq(units.companyId, companyId)).orderBy(units.name);
      res.json(allUnits);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { code, name, departmentId, managerUid } = req.body;
      const result = await db.insert(units).values({
        companyId,
        code,
        name,
        departmentId: departmentId || null,
        managerUid: managerUid || null,
      }).returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to create unit" });
    }
  });

  app.put("/api/units/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code, name, departmentId, managerUid } = req.body;
      const result = await db.update(units)
        .set({
          code,
          name,
          departmentId: departmentId || null,
          managerUid: managerUid || null,
        })
        .where(eq(units.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to update unit" });
    }
  });

  app.put("/api/units/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const result = await db.update(units)
        .set({ status })
        .where(eq(units.id, parseInt(req.params.id)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to update unit status" });
    }
  });

  // Organogram: Departments & Units Tree
  app.get("/api/admin/organogram/departments", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) {
        const fallbackCompany = await db.select().from(companies).limit(1);
        if (fallbackCompany.length > 0) companyId = fallbackCompany[0].id;
      }
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const allDepts = await db
        .select({
          id: departments.id,
          name: departments.name,
          code: departments.code,
          parentId: departments.parentId,
          managerUid: departments.managerUid,
        })
        .from(departments)
        .where(eq(departments.companyId, companyId));

      const allUnits = await db
        .select({
          id: units.id,
          name: units.name,
          code: units.code,
          departmentId: units.departmentId,
          managerUid: units.managerUid,
        })
        .from(units)
        .where(eq(units.companyId, companyId));

      const usersList = await db.select({ uid: users.uid, name: users.name, designation: users.designation }).from(users).where(eq(users.companyId, companyId));

      // Build tree
      const deptMap: Record<number, any> = {};
      const roots: any[] = [];

      allDepts.forEach(dept => {
        const manager = usersList.find(u => u.uid === dept.managerUid);
        deptMap[dept.id] = { ...dept, type: 'department', manager, children: [] };
      });

      allUnits.forEach(unit => {
        const manager = usersList.find(u => u.uid === unit.managerUid);
        const unitNode = { ...unit, type: 'unit', manager, children: [] };
        if (unit.departmentId && deptMap[unit.departmentId]) {
          deptMap[unit.departmentId].children.push(unitNode);
        }
      });

      allDepts.forEach(dept => {
        if (dept.parentId && deptMap[dept.parentId]) {
          deptMap[dept.parentId].children.push(deptMap[dept.id]);
        } else {
          roots.push(deptMap[dept.id]);
        }
      });

      res.json({ tree: roots, flatDepts: allDepts, flatUnits: allUnits });
    } catch (error) {
      console.error("Failed to fetch departments tree:", error);
      res.status(500).json({ error: "Failed to fetch departments tree" });
    }
  });

  // ==========================================
  // INVENTORY - STOCK IN / OUT
  // ==========================================
  app.get("/api/inventory/stock-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const records = await db
        .select({
          transaction: stock_transactions,
          item: inventory_items,
          user: users,
          warehouse: warehouses,
          vendor: vendors
        })
        .from(stock_transactions)
        .innerJoin(inventory_items, eq(stock_transactions.itemId, inventory_items.id))
        .leftJoin(users, eq(stock_transactions.performedBy, users.uid))
        .leftJoin(warehouses, eq(stock_transactions.warehouseId, warehouses.id))
        .leftJoin(vendors, eq(stock_transactions.vendorId, vendors.id))
        .where(and(eq(stock_transactions.companyId, companyId), eq(stock_transactions.transactionType, 'Stock In')))
        .orderBy(desc(stock_transactions.createdAt));

      const formatted = records.map(r => ({
        ...r.transaction,
        itemName: r.item.name,
        itemCode: r.item.itemCode,
        category: r.item.category,
        isAdminItem: r.item.isAdminItem,
        isItItem: r.item.isItItem,
        warehouseName: r.warehouse?.name || 'N/A',
        vendorName: r.vendor?.name || 'N/A',
        performedByName: r.user?.name || r.user?.email || 'System',
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error("Fetch stock in error:", error);
      res.status(500).json({ error: "Failed to fetch stock in history" });
    }
  });
  app.post("/api/inventory/stock-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { itemId, quantity, remarks, warehouseId, vendorId } = req.body;
      if (!itemId || !quantity || !warehouseId) return res.status(400).json({ error: "Missing required fields" });

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];

      if (dbUser) {
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, Number(warehouseId), [Number(itemId)]);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse or item type." });
        }
      }

      // Find item
      const item = await db.select().from(inventory_items).where(eq(inventory_items.id, itemId)).limit(1);
      if (!item.length) return res.status(404).json({ error: "Item not found" });
      const itemData = item[0];

      // Update inventory_items
      await db.update(inventory_items)
        .set({ quantityInStock: item[0].quantityInStock + Number(quantity) })
        .where(eq(inventory_items.id, itemId));

      // Record transaction
      await db.insert(stock_transactions).values({
        companyId,
        itemId,
        warehouseId,
        vendorId: vendorId || null,
        transactionType: 'Stock In',
        quantity: Number(quantity),
        referenceId: remarks,
        performedBy: req.user?.uid,
      });

      // Update or Create Warehouse Stock
      const wStock = await db.select().from(warehouse_stock)
        .where(and(
          eq(warehouse_stock.companyId, companyId),
          eq(warehouse_stock.warehouseId, warehouseId),
          eq(warehouse_stock.itemId, itemId)
        )).limit(1);

      if (wStock.length > 0) {
        await db.update(warehouse_stock)
          .set({ quantity: wStock[0].quantity + Number(quantity) })
          .where(eq(warehouse_stock.id, wStock[0].id));
      } else {
        await db.insert(warehouse_stock).values({
          companyId,
          warehouseId,
          itemId,
          quantity: Number(quantity)
        });
      }

      // Update or Create Global Stock Ledger
      const ledger = await db.select().from(global_stock_ledger).where(and(eq(global_stock_ledger.companyId, companyId), eq(global_stock_ledger.itemId, itemId))).limit(1);
      if (ledger.length > 0) {
        await db.update(global_stock_ledger)
          .set({
            totalStockIn: ledger[0].totalStockIn + Number(quantity),
            closingBalance: ledger[0].closingBalance + Number(quantity),
            lastUpdated: new Date()
          })
          .where(eq(global_stock_ledger.id, ledger[0].id));
      } else {
        await db.insert(global_stock_ledger).values({
          companyId,
          itemId,
          openingBalance: item[0].quantityInStock,
          totalStockIn: Number(quantity),
          closingBalance: item[0].quantityInStock + Number(quantity),
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Stock In error:", error);
      res.status(500).json({ error: "Failed to process stock in" });
    }
  });

  app.post("/api/inventory/stock-out", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const { itemId, quantity, reason, warehouseId } = req.body;
      if (!itemId || !quantity || !reason || !warehouseId) return res.status(400).json({ error: "Missing required fields" });

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      if (dbUser) {
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, Number(warehouseId), [Number(itemId)]);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage this warehouse or item type." });
        }
      }

      const requestNumber = 'SO-' + Date.now();
      const newRequest = await db.insert(stock_out_requests).values({
        companyId,
        requestNumber,
        warehouseId,
        itemId,
        quantity: Number(quantity),
        reason,
        status: 'Pending',
        requestedBy: req.user?.uid,
      }).returning();
      
      const newReqId = newRequest[0].id;
      
      const department = dbUser?.department || 'Global';

      // Setup Approvals based on BPMN
      let defs = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Stock Out'), eq(bpmn_definitions.isActive, true)));

      let approvalsToInsert: any[] = [];
      if (defs.length > 0) {
        const xmlData = defs[0].xmlData;
        const context = { department: department };
        const path = evaluateWorkflowPath(xmlData, context);
        let stepOrder = 1;
        for (const task of path) {
          approvalsToInsert.push({
            companyId,
            documentType: 'Stock Out',
            documentId: newReqId,
            stepOrder: stepOrder++,
            roleRequired: task.assigneeValue,
            assigneeType: task.assigneeType,
            assigneeValue: task.assigneeValue,
            status: 'Pending'
          });
        }
      }

      if (approvalsToInsert.length > 0) {
        await db.insert(document_approvals).values(approvalsToInsert);

        // Assign Inbox Task to the first step ONLY
        const firstStep = approvalsToInsert[0];
        if (firstStep.assigneeType === 'Department Role') {
          // If department role, e.g. Department Head, find manager
          const dept = await db.select().from(departments).where(and(eq(departments.companyId, companyId), eq(departments.name, department))).limit(1);
          if (dept.length > 0 && dept[0].managerUid) {
            await db.insert(inbox_tasks).values({
              companyId,
              assignedToUid: dept[0].managerUid,
              category: 'Inventory',
              title: `Pending Stock Out: ${requestNumber}`,
              message: `${req.user?.name || 'User'} requested ${quantity} units. Reason: ${reason}`,
              actionLink: `/stock-out`,
              referenceType: 'StockOut',
              referenceId: newReqId,
              status: 'Pending'
            });
          }
        } else {
          // It's a specific designation or global role
          await db.insert(inbox_tasks).values({
            companyId,
            assignedToRole: firstStep.assigneeValue,
            category: 'Inventory',
            title: `Pending Stock Out: ${requestNumber}`,
            message: `${req.user?.name || 'User'} requested ${quantity} units. Reason: ${reason}`,
            actionLink: `/stock-out`,
            referenceType: 'StockOut',
            referenceId: newReqId,
            status: 'Pending'
          });
        }
      } else {
        // No BPMN workflow found? Create a default task for Super Admin so it's not lost
        await db.insert(inbox_tasks).values({
          companyId,
          assignedToRole: 'Super Admin',
          category: 'Inventory',
          title: `Pending Stock Out: ${requestNumber} (No Workflow)`,
          message: `${req.user?.name || 'User'} requested ${quantity} units. Please configure Stock Out workflow.`,
          actionLink: `/stock-out`,
          referenceType: 'StockOut',
          referenceId: newReqId,
          status: 'Pending'
        });
      }

      res.json(newRequest[0]);
    } catch (error: any) {
      console.error("Stock Out request error:", error);
      res.status(500).json({ error: "Failed to request stock out" });
    }
  });

  app.get("/api/inventory/stock-out", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);

      const requests = await db
        .select({
          request: stock_out_requests,
          item: inventory_items,
          user: users,
        })
        .from(stock_out_requests)
        .innerJoin(inventory_items, eq(stock_out_requests.itemId, inventory_items.id))
        .leftJoin(users, eq(stock_out_requests.requestedBy, users.uid))
        .where(eq(stock_out_requests.companyId, companyId))
        .orderBy(desc(stock_out_requests.createdAt));
      const formatted = requests.map(r => ({
        ...r.request,
        itemName: r.item.name,
        itemCode: r.item.itemCode,
        category: r.item.category,
        isAdminItem: r.item.isAdminItem,
        isItItem: r.item.isItItem,
        requestedByName: r.user?.name || r.user?.email || 'Unknown',
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error("Fetch stock out error:", error);
      res.status(500).json({ error: "Failed to fetch stock out requests" });
    }
  });

  app.post("/api/inventory/stock-out/approvals/:id", requireAuth, async (req: AuthRequest, res) => {
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
        actionResult: status,
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
          // ALL steps approved! Execute Stock Deduction with reservation-aware check
          const item = await db.select().from(inventory_items).where(eq(inventory_items.id, request[0].itemId)).limit(1);
          
          if (!item.length) {
            await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
            return res.status(400).json({ error: "Item not found in inventory." });
          }

          // Phase 1: Check available stock = total - reserved (excluding THIS request's own reservation)
          const activeReservations = await db.select().from(stock_reservations).where(and(
            eq(stock_reservations.itemId, item[0].id),
            eq(stock_reservations.status, 'Active')
          ));
          const reservedByOthers = activeReservations
            .filter(r => r.stockOutRequestId !== requestId)
            .reduce((sum, r) => sum + (r.reservedQty || 0), 0);
          const effectiveAvailable = (item[0].quantityInStock || 0) - reservedByOthers;

          if (effectiveAvailable < request[0].quantity) {
            await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
            return res.status(400).json({ 
              error: `Insufficient available stock. Total: ${item[0].quantityInStock}, Reserved by others: ${reservedByOthers}, Available: ${effectiveAvailable}, Requested: ${request[0].quantity}` 
            });
          }

          // Check warehouse stock
          if (request[0].warehouseId) {
             const ws = await db.select().from(warehouse_stock).where(and(eq(warehouse_stock.warehouseId, request[0].warehouseId), eq(warehouse_stock.itemId, item[0].id))).limit(1);
             if (!ws.length || (ws[0].quantity || 0) < request[0].quantity) {
                await db.update(document_approvals).set({ status: 'Pending' }).where(eq(document_approvals.id, pendingStep.id));
                return res.status(400).json({ error: `Insufficient stock in the selected warehouse. Available: ${ws[0]?.quantity || 0}` });
             }
             // Deduct from warehouse
             await db.update(warehouse_stock).set({ quantity: (ws[0].quantity || 0) - request[0].quantity }).where(eq(warehouse_stock.id, ws[0].id));
          }

          await db.update(stock_out_requests).set({ status: 'Approved', updatedAt: new Date() }).where(eq(stock_out_requests.id, requestId));

          const newQty = (item[0].quantityInStock || 0) - request[0].quantity;
          await db.update(inventory_items)
            .set({ quantityInStock: newQty })
            .where(eq(inventory_items.id, item[0].id));

          // Phase 1: Release any active reservation for this stock-out request
          await db.update(stock_reservations)
            .set({ status: 'Approved' })
            .where(and(
              eq(stock_reservations.stockOutRequestId, requestId),
              eq(stock_reservations.status, 'Active')
            ));

          await db.insert(stock_transactions).values({
            companyId: request[0].companyId,
            itemId: item[0].id,
            warehouseId: request[0].warehouseId,
            transactionType: 'Stock Out',
            quantity: request[0].quantity,
            referenceId: request[0].requestNumber,
            performedBy: req.user.uid,
          });

          // Phase 1: Record consumption history for demand forecasting
          try {
            const today = new Date().toISOString().split('T')[0];
            if (request[0].warehouseId) {
              await db.insert(stock_consumption_history).values({
                companyId: request[0].companyId,
                warehouseId: request[0].warehouseId,
                itemId: item[0].id,
                consumptionDate: today,
                consumedQty: request[0].quantity,
                referenceId: request[0].requestNumber,
              }).onConflictDoNothing();
            }
          } catch (consumptionErr) {
            console.warn('Consumption history record skipped:', consumptionErr);
          }

          // Phase 1: Check reorder point and notify if stock is low
          if (item[0].reorderPoint && newQty <= (item[0].reorderPoint || 0)) {
            try {
              // Notify Super Admins and procurement team about low stock
              const superAdmins = await db.select().from(users).where(and(
                eq(users.companyId, request[0].companyId!),
                eq(users.role, 'Super Admin')
              )).limit(3);
              for (const admin of superAdmins) {
                await db.insert(notifications).values({
                  userId: admin.uid,
                  title: `âš ï¸ Low Stock Alert: ${item[0].name}`,
                  message: `Stock level (${newQty} ${item[0].uom}) has dropped to or below reorder point (${item[0].reorderPoint}). Please initiate a Purchase Requisition.`,
                  type: 'WARNING',
                  link: '/inventory',
                });
              }
            } catch (alertErr) {
              console.warn('Low stock alert skipped:', alertErr);
            }
          }

          const ledger = await db.select().from(global_stock_ledger).where(and(eq(global_stock_ledger.companyId, request[0].companyId), eq(global_stock_ledger.itemId, item[0].id))).limit(1);
          if (ledger.length > 0) {
            await db.update(global_stock_ledger)
              .set({
                totalStockOut: (ledger[0].totalStockOut || 0) + request[0].quantity,
                closingBalance: (ledger[0].closingBalance || 0) - request[0].quantity,
                lastUpdated: new Date()
              })
              .where(eq(global_stock_ledger.id, ledger[0].id));
          }
        } else {
          // Notify next approver
          const nextStep = remainingSteps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
          await db.insert(inbox_tasks).values({
            companyId: request[0].companyId,
            assignedToRole: nextStep.assigneeValue || nextStep.roleRequired,
            category: 'Inventory',
            title: `Pending Stock Out: ${request[0].requestNumber}`,
            message: `Stock Out ${request[0].requestNumber} requires your approval.`,
            actionLink: `/stock-out`,
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
  });



  app.get("/api/inventory/global-stock", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const ledger = await db
        .select({
          ledger: global_stock_ledger,
          item: inventory_items,
        })
        .from(global_stock_ledger)
        .innerJoin(inventory_items, eq(global_stock_ledger.itemId, inventory_items.id))
        .where(eq(global_stock_ledger.companyId, companyId));
      
      const formatted = ledger.map(l => ({
        ...l.ledger,
        itemName: l.item.name,
        category: l.item.category,
        itemCode: l.item.itemCode,
        uom: l.item.uom,
      }));
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ledger" });
    }
  });

  // ==========================================
  // INBOX TASKS
  // ==========================================
  app.get("/api/inbox", requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!companyId) return res.status(400).json({ error: "No company context" });

      const uid = req.user?.uid;
      const dbUser = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      const userRole = dbUser[0]?.role;
      const userDesignation = dbUser[0]?.designation;

      let tasks;
      if (userRole === 'Super Admin') {
        // Super Admin sees all tasks for the company
        tasks = await db.select().from(inbox_tasks)
          .where(eq(inbox_tasks.companyId, companyId))
          .orderBy(desc(inbox_tasks.createdAt));
      } else {
        // Normal users see tasks assigned to them, their role, or their designation
        tasks = await db.select().from(inbox_tasks)
          .where(
            and(
              eq(inbox_tasks.companyId, companyId),
              or(
                eq(inbox_tasks.assignedToUid, uid || ''),
                eq(inbox_tasks.assignedToRole, userRole || ''),
                eq(inbox_tasks.assignedToRole, userDesignation || '')
              )
            )
          )
          .orderBy(desc(inbox_tasks.createdAt));
      }
      
      // Fetch PRs to match with tasks
      const prs = await db.select().from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const userBranchId = dbUser[0]?.branchId;
      const allUsers = await db.select({ uid: users.uid, branchId: users.branchId }).from(users).where(eq(users.companyId, companyId));
      
      const seen = new Set();
      const deduplicatedTasks = [];
      for (const task of tasks) {
        if (task.referenceType && task.referenceId) {
          const key = `${task.referenceType}-${task.referenceId}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduplicatedTasks.push(task);
          }
        } else {
          deduplicatedTasks.push(task);
        }
      }

      // Branch isolation for role-matched tasks
      const branchScopedTasks = deduplicatedTasks.filter((task: any) => {
        if (userRole === 'Super Admin') return true;
        if (task.assignedToUid === uid) return true;

        if (task.referenceType === 'PR') {
          const pr = prs.find((p: any) => p.id === task.referenceId);
          if (pr) {
            const creator = allUsers.find(u => u.uid === pr.uid);
            if (creator && creator.branchId && userBranchId) {
              return creator.branchId === userBranchId;
            }
          }
        }
        return true;
      });

      // Fetch pending document approvals for User Registration
      const userRegApprovals = await db.select().from(document_approvals)
        .where(and(
          eq(document_approvals.companyId, companyId), 
          eq(document_approvals.documentType, 'User Registration'), 
          eq(document_approvals.status, 'Pending')
        ));

      const enrichedTasks = branchScopedTasks.map((task: any) => {
        if (task.referenceType === 'PR') {
          const pr = prs.find((p: any) => p.id === task.referenceId);
          return {
            ...task,
            prStatus: pr ? pr.status : null,
            prNumber: pr ? pr.prNumber : null
          };
        }
        if (task.referenceType === 'User Registration') {
          const pendingSteps = userRegApprovals.filter((a: any) => a.documentId === task.referenceId);
          return {
            ...task,
            isFinalStep: pendingSteps.length <= 1
          };
        }
        return task;
      });

      res.json(enrichedTasks);
    } catch (error) {
      console.error("Fetch inbox error:", error);
      res.status(500).json({ error: "Failed to fetch inbox tasks" });
    }
  });

  app.post("/api/inbox/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      await db.update(inbox_tasks).set({ status, actionResult: status, updatedAt: new Date() }).where(eq(inbox_tasks.id, taskId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update task status" });
    }
  });

  // ==========================================
  // STOCK TRANSFERS
  // ==========================================
  
  app.get("/api/stock-transfers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const transfers = await db.select().from(stock_transfers).where(eq(stock_transfers.companyId, companyId)).orderBy(desc(stock_transfers.createdAt));
      
      const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
      
      const enriched = transfers.map(t => {
        const source = allWarehouses.find(w => w.id === t.sourceWarehouseId);
        const dest = allWarehouses.find(w => w.id === t.destinationWarehouseId);
        return {
          ...t,
          sourceWarehouseName: source?.name || 'Unknown',
          destinationWarehouseName: dest?.name || 'Unknown'
        };
      });
      res.json(enriched);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch stock transfers" });
    }
  });

  app.get("/api/stock-transfers/incoming", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      
      const userRole = await db.select().from(users).where(eq(users.uid, req.user.uid)).then(r => r[0]?.role);
      let managedWarehouseIds: number[] = [];
      
      if (userRole !== 'Super Admin') {
        const managers = await db.select().from(warehouse_managers).where(eq(warehouse_managers.userId, req.user.uid));
        managedWarehouseIds = managers.map(m => m.warehouseId);
        if (managedWarehouseIds.length === 0) {
          return res.json([]);
        }
      }
      
      let incoming = await db.select().from(stock_transfers).where(
        and(
          eq(stock_transfers.companyId, companyId),
          eq(stock_transfers.status, 'Transit')
        )
      ).orderBy(desc(stock_transfers.createdAt));
      
      if (userRole !== 'Super Admin') {
        incoming = incoming.filter(t => managedWarehouseIds.includes(t.destinationWarehouseId));
      }
      
      const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
      const enriched = incoming.map(t => {
        const source = allWarehouses.find(w => w.id === t.sourceWarehouseId);
        const dest = allWarehouses.find(w => w.id === t.destinationWarehouseId);
        return {
          ...t,
          sourceWarehouseName: source?.name || 'Unknown',
          destinationWarehouseName: dest?.name || 'Unknown'
        };
      });
      res.json(enriched);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch incoming transfers" });
    }
  });

  app.post("/api/stock-transfers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      
      const { sourceWarehouseId, destinationWarehouseId, items } = req.body;
      if (!sourceWarehouseId || !destinationWarehouseId || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (sourceWarehouseId === destinationWarehouseId) {
        return res.status(400).json({ error: "Source and destination must be different" });
      }

      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      if (dbUser) {
        const itemIds = items.map((i: any) => Number(i.itemId));
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, Number(sourceWarehouseId), itemIds);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage the source warehouse or an item type within." });
        }

        // Fixed Asset Safeguard: Block Fixed Assets from Inventory Stock Transfer
        const targetItems = await db.select().from(inventory_items).where(inArray(inventory_items.id, itemIds));
        const fixedAssetItem = targetItems.find((i: any) => i.isFixedAsset);
        if (fixedAssetItem) {
          return res.status(400).json({ error: `Item '${fixedAssetItem.name}' is a Fixed Asset. Fixed Assets must be transferred via the Asset Management module.` });
        }
      }

      // Check stock availability
      for (const item of items) {
        const ws = await db.select().from(warehouse_stock).where(
          and(
            eq(warehouse_stock.warehouseId, sourceWarehouseId),
            eq(warehouse_stock.itemId, item.itemId)
          )
        );
        const currentQty = ws[0]?.quantity || 0;
        if (currentQty < item.quantity) {
          const invItem = await db.select().from(inventory_items).where(eq(inventory_items.id, item.itemId));
          return res.status(400).json({ error: `Insufficient stock for ${invItem[0]?.name || 'Item'}` });
        }
      }

      // Generate Transfer Number
      const lastTransfer = await db.select().from(stock_transfers).where(eq(stock_transfers.companyId, companyId)).orderBy(desc(stock_transfers.id)).limit(1);
      const nextId = lastTransfer.length > 0 ? lastTransfer[0].id + 1 : 1;
      const transferNumber = `TRN-${new Date().getFullYear()}-${String(nextId).padStart(4, '0')}`;

      const newTransfer = await db.insert(stock_transfers).values({
        companyId,
        transferNumber,
        sourceWarehouseId: parseInt(sourceWarehouseId),
        destinationWarehouseId: parseInt(destinationWarehouseId),
        status: 'Pending Approval',
        requestedBy: req.user.uid
      }).returning();
      
      const transferId = newTransfer[0].id;
      
      const itemInserts = items.map((i: any) => ({
        transferId,
        itemId: i.itemId,
        quantity: parseInt(i.quantity)
      }));
      await db.insert(stock_transfer_items).values(itemInserts);

      // Start BPMN Workflow
      const workflow = await db.select().from(bpmn_definitions).where(and(eq(bpmn_definitions.companyId, companyId), eq(bpmn_definitions.documentType, 'Stock Transfer')));
      if (workflow.length > 0) {
        const wflow = workflow[0];
        try {
          const path = evaluateWorkflowPath(wflow.xmlData, { amount: 0, department: 'Global' });
          let stepOrder = 1;
          const approvalsToInsert = [];
          for (const task of path) {
            approvalsToInsert.push({
              companyId,
              documentType: 'Stock Transfer',
              documentId: transferId,
              stepOrder: stepOrder++,
              roleRequired: task.assigneeValue,
              assigneeType: task.assigneeType,
              assigneeValue: task.assigneeValue,
              status: 'Pending'
            });
          }
          if (approvalsToInsert.length > 0) {
            await db.insert(document_approvals).values(approvalsToInsert);
            const firstStep = approvalsToInsert[0];
            const { notifyApprovers } = require('./src/shared/lib/notifications.js');
            await notifyApprovers(companyId, firstStep.assigneeType, firstStep.assigneeValue, 'Global', "Stock Transfer Approval Required", `Transfer ${transferNumber} requires your approval.`, "ACTION", "/inbox", "ST", transferId);
          }
        } catch(e) {
          console.error("Workflow parsing failed", e);
        }
      }
      
      res.json({ success: true, transferNumber });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to create stock transfer" });
    }
  });
app.post("/api/stock-transfers/:id/submit-approval", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const transferId = parseInt(req.params.id);
      const { status, comments } = req.body;
      
      const transfer = await db.select().from(stock_transfers).where(eq(stock_transfers.id, transferId));
      if (!transfer.length) return res.status(404).json({ error: "Transfer not found" });
      
      const approvals = await db.select().from(document_approvals).where(
        and(
          eq(document_approvals.documentType, 'Stock Transfer'),
          eq(document_approvals.documentId, transferId)
        )
      ).orderBy(document_approvals.stepOrder);
      
      const pendingStep = approvals.find(a => a.status === 'Pending');
      if (!pendingStep) {
        return res.status(400).json({ error: "No pending approvals for this transfer" });
      }

      await db.update(document_approvals).set({
        status,
        comments,
        approvedBy: req.user.uid,
        updatedAt: new Date()
      }).where(eq(document_approvals.id, pendingStep.id));

      // Clear pending inbox tasks
      await db.update(inbox_tasks).set({
        status: 'Completed',
        actionResult: status,
        updatedAt: new Date()
      }).where(and(
        eq(inbox_tasks.referenceType, 'ST'), 
        eq(inbox_tasks.referenceId, transferId),
        eq(inbox_tasks.status, 'Pending')
      ));

      if (status === 'Rejected') {
        await db.update(stock_transfers).set({ status: 'Rejected', updatedAt: new Date() }).where(eq(stock_transfers.id, transferId));
      } else if (status === 'Review') {
        await db.update(stock_transfers).set({ status: 'Draft', updatedAt: new Date() }).where(eq(stock_transfers.id, transferId));
        await db.delete(document_approvals).where(and(eq(document_approvals.documentId, transferId), eq(document_approvals.documentType, 'Stock Transfer'), eq(document_approvals.status, 'Pending')));
      } else if (status === 'Approved') {
        const remainingSteps = approvals.filter(a => a.id !== pendingStep.id && a.status === 'Pending');
        if (remainingSteps.length === 0) {
          // Fully approved: Change status to Transit, set dispatchDate, deduct from source
          await db.update(stock_transfers).set({ 
            status: 'Transit', 
            dispatchDate: new Date(),
            updatedAt: new Date() 
          }).where(eq(stock_transfers.id, transferId));
          
          const items = await db.select().from(stock_transfer_items).where(eq(stock_transfer_items.transferId, transferId));
          for (const item of items) {
            // Deduct from Source
            const sourceStock = await db.select().from(warehouse_stock).where(
              and(
                eq(warehouse_stock.warehouseId, transfer[0].sourceWarehouseId),
                eq(warehouse_stock.itemId, item.itemId)
              )
            );
            if (sourceStock.length > 0) {
              await db.update(warehouse_stock)
                .set({ quantity: sourceStock[0].quantity - item.quantity, lastUpdated: new Date() })
                .where(eq(warehouse_stock.id, sourceStock[0].id));
            }
            // Record Outward transaction
            await db.insert(stock_transactions).values({
              companyId: transfer[0].companyId!,
              itemId: item.itemId,
              warehouseId: transfer[0].sourceWarehouseId,
              transactionType: 'Stock Transfer Out',
              quantity: item.quantity,
              referenceId: transfer[0].transferNumber,
              createdAt: new Date()
            });
          }
        } else {
          // Notify next approver
          const nextStep = remainingSteps.sort((a, b) => a.stepOrder - b.stepOrder)[0];
          const { notifyApprovers } = require('./src/shared/lib/notifications.js');
          await notifyApprovers(transfer[0].companyId!, nextStep.assigneeType || 'Role', nextStep.assigneeValue || nextStep.roleRequired, "Global", "Stock Transfer Approval Required", `Transfer ${transfer[0].transferNumber} requires your approval.`, "ACTION", "/inbox", "ST", transferId);
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to approve transfer" });
    }
  });

  app.post("/api/stock-transfers/:id/receive", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "Company required" });
      const transferId = parseInt(req.params.id);
      
      const transfer = await db.select().from(stock_transfers).where(eq(stock_transfers.id, transferId));
      if (!transfer.length || transfer[0].status !== 'Transit') return res.status(400).json({ error: "Invalid transfer state" });
      
      const dbUserResult = await db.select().from(users).where(eq(users.uid, req.user!.uid)).limit(1);
      const dbUser = dbUserResult[0];
      if (dbUser) {
        const items = await db.select().from(stock_transfer_items).where(eq(stock_transfer_items.transferId, transferId));
        const itemIds = items.map(i => i.itemId);
        const hasAccess = await verifyWarehouseAccess(dbUser.uid, dbUser.role, transfer[0].destinationWarehouseId!, itemIds);
        if (!hasAccess) {
          return res.status(403).json({ error: "Forbidden: You are not assigned to manage the destination warehouse or an item type within." });
        }
      }
      
      // Update status to Received and set actualArrivalDate
      await db.update(stock_transfers).set({ 
        status: 'Received', 
        actualArrivalDate: new Date(),
        updatedAt: new Date() 
      }).where(eq(stock_transfers.id, transferId));
      
      // Add to destination warehouse
      const items = await db.select().from(stock_transfer_items).where(eq(stock_transfer_items.transferId, transferId));
      for (const item of items) {
        const destStock = await db.select().from(warehouse_stock).where(
          and(
            eq(warehouse_stock.warehouseId, transfer[0].destinationWarehouseId),
            eq(warehouse_stock.itemId, item.itemId)
          )
        );
        
        if (destStock.length > 0) {
          await db.update(warehouse_stock)
            .set({ quantity: destStock[0].quantity + item.quantity, lastUpdated: new Date() })
            .where(eq(warehouse_stock.id, destStock[0].id));
        } else {
          await db.insert(warehouse_stock).values({
            companyId,
            warehouseId: transfer[0].destinationWarehouseId,
            itemId: item.itemId,
            quantity: item.quantity
          });
        }
        
        // Record Inward transaction
        await db.insert(stock_transactions).values({
          companyId,
          itemId: item.itemId,
          warehouseId: transfer[0].destinationWarehouseId,
          transactionType: 'Stock Transfer In',
          quantity: item.quantity,
          referenceId: transfer[0].transferNumber,
          performedBy: req.user.uid
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to receive transfer" });
    }
  });


  // ================================================================
  // PHASE 1 NEW API ROUTES
  // ================================================================

  // --- STOCK RESERVATIONS ---
  app.get("/api/inventory/stock-reservations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const reservations = await db.select().from(stock_reservations).where(eq(stock_reservations.companyId, companyId));
      res.json(reservations);
    } catch (e) { res.status(500).json({ error: "Failed to fetch reservations" }); }
  });

  app.post("/api/inventory/stock-reservations/expire", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "No company context" });
      const now = new Date();
      await db.update(stock_reservations)
        .set({ status: 'Expired' })
        .where(and(
          eq(stock_reservations.companyId, companyId),
          eq(stock_reservations.status, 'Active'),
          sql`${stock_reservations.expiresAt} < ${now}`
        ));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to expire reservations" }); }
  });

  // --- REJECTED ITEM DISPOSITIONS ---
  app.get("/api/inventory/rejected-items", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const items = await db.select({
        disposition: rejected_item_dispositions,
        qc: qc_inspections,
        grnRecord: grn,
      })
        .from(rejected_item_dispositions)
        .leftJoin(qc_inspections, eq(rejected_item_dispositions.qcInspectionId, qc_inspections.id))
        .leftJoin(grn, eq(rejected_item_dispositions.grnId, grn.id))
        .where(eq(rejected_item_dispositions.companyId, companyId))
        .orderBy(desc(rejected_item_dispositions.createdAt));
      res.json(items.map(r => ({ ...r.disposition, grnNumber: r.grnRecord?.grnNumber, defectCategory: r.qc?.defectCategory })));
    } catch (e) { res.status(500).json({ error: "Failed to fetch rejected items" }); }
  });

  app.put("/api/inventory/rejected-items/:id/disposition", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      const { dispositionType, notes, vendorCreditNoteNumber } = req.body;
      if (!dispositionType) return res.status(400).json({ error: "dispositionType is required" });
      await db.update(rejected_item_dispositions).set({
        dispositionType, notes, vendorCreditNoteNumber,
        status: 'In_Process', disposedByUid: req.user.uid, disposedAt: new Date(),
      }).where(eq(rejected_item_dispositions.id, id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to set disposition" }); }
  });

  app.put("/api/inventory/rejected-items/:id/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      await db.update(rejected_item_dispositions).set({ status: 'Completed', disposedAt: new Date() }).where(eq(rejected_item_dispositions.id, id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to complete disposition" }); }
  });

  // --- PHYSICAL STOCK COUNTS (RECONCILIATION) ---
  app.get("/api/inventory/stock-counts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const counts = await db.select({ count: physical_stock_counts, warehouse: warehouses })
        .from(physical_stock_counts)
        .leftJoin(warehouses, eq(physical_stock_counts.warehouseId, warehouses.id))
        .where(eq(physical_stock_counts.companyId, companyId))
        .orderBy(desc(physical_stock_counts.createdAt));
      res.json(counts.map(r => ({ ...r.count, warehouseName: r.warehouse?.name })));
    } catch (e) { res.status(500).json({ error: "Failed to fetch stock counts" }); }
  });

  app.post("/api/inventory/stock-counts", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "No company context" });
      const { warehouseId, countType, scheduledDate, notes } = req.body;
      if (!warehouseId || !scheduledDate) return res.status(400).json({ error: "warehouseId and scheduledDate required" });
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
      const existing = await db.select({ count: sql<number>`count(*)` }).from(physical_stock_counts).where(eq(physical_stock_counts.companyId, companyId));
      const seq = String(Number(existing[0].count) + 1).padStart(4, '0');
      const countNumber = `PSC-${dateStr}-${seq}`;
      const newCount = await db.insert(physical_stock_counts).values({
        companyId, warehouseId: Number(warehouseId), countNumber,
        countType: countType || 'Spot-Check', scheduledDate: new Date(scheduledDate),
        notes, createdByUid: req.user.uid,
      }).returning();
      // Pre-populate details with current system quantities
      const warehouseItems = await db.select().from(warehouse_stock).where(and(
        eq(warehouse_stock.companyId, companyId), eq(warehouse_stock.warehouseId, Number(warehouseId))
      ));
      if (warehouseItems.length > 0) {
        await db.insert(physical_count_details).values(warehouseItems.map(ws => ({
          countId: newCount[0].id, itemId: ws.itemId, warehouseStockId: ws.id, systemQty: ws.quantity || 0,
        })));
      }
      res.json(newCount[0]);
    } catch (e: any) { res.status(500).json({ error: "Failed to create stock count: " + e.message }); }
  });

  app.get("/api/inventory/stock-counts/:id/details", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const details = await db.select({ detail: physical_count_details, item: inventory_items })
        .from(physical_count_details)
        .leftJoin(inventory_items, eq(physical_count_details.itemId, inventory_items.id))
        .where(eq(physical_count_details.countId, id))
        .orderBy(inventory_items.name);
      res.json(details.map(r => ({ ...r.detail, itemName: r.item?.name, itemCode: r.item?.itemCode, uom: r.item?.uom, basePrice: r.item?.basePrice })));
    } catch (e) { res.status(500).json({ error: "Failed to fetch count details" }); }
  });

  app.put("/api/inventory/stock-counts/:id/start", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id);
      await db.update(physical_stock_counts).set({ status: 'In-Progress', actualStartDate: new Date() }).where(eq(physical_stock_counts.id, id));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to start count" }); }
  });

  app.put("/api/inventory/stock-counts/details/:detailId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const detailId = parseInt(req.params.detailId);
      const { physicalQty, varianceReason, notes } = req.body;
      const detail = await db.select().from(physical_count_details).where(eq(physical_count_details.id, detailId)).limit(1);
      if (!detail.length) return res.status(404).json({ error: "Detail not found" });
      const varianceQty = (Number(physicalQty) ?? 0) - (detail[0].systemQty || 0);
      const item = await db.select().from(inventory_items).where(eq(inventory_items.id, detail[0].itemId)).limit(1);
      const varianceValue = item.length > 0 ? varianceQty * Number(item[0].basePrice || 0) : 0;
      await db.update(physical_count_details).set({
        physicalQty: Number(physicalQty), varianceQty, varianceValue: String(varianceValue), varianceReason, notes,
      }).where(eq(physical_count_details.id, detailId));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to update count detail" }); }
  });

  app.put("/api/inventory/stock-counts/:id/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const details = await db.select().from(physical_count_details).where(eq(physical_count_details.countId, id));
      const counted = details.filter(d => d.physicalQty !== null && d.physicalQty !== undefined);
      const variances = counted.filter(d => (d.varianceQty || 0) !== 0);
      const totalVarianceValue = variances.reduce((sum, d) => sum + Number(d.varianceValue || 0), 0);
      await db.update(physical_stock_counts).set({
        status: 'Completed', completedDate: new Date(),
        totalItemsCounted: counted.length, totalVariances: variances.length,
        totalVarianceValue: String(totalVarianceValue),
      }).where(eq(physical_stock_counts.id, id));
      res.json({ success: true, totalItemsCounted: counted.length, totalVariances: variances.length, totalVarianceValue });
    } catch (e) { res.status(500).json({ error: "Failed to complete count" }); }
  });

  app.put("/api/inventory/stock-counts/:id/approve", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "No company context" });
      const id = parseInt(req.params.id);
      const countRecord = await db.select().from(physical_stock_counts).where(eq(physical_stock_counts.id, id)).limit(1);
      if (!countRecord.length) return res.status(404).json({ error: "Count not found" });
      if (countRecord[0].status !== 'Completed') return res.status(400).json({ error: "Count must be Completed first" });
      const details = await db.select().from(physical_count_details).where(eq(physical_count_details.countId, id));
      const variances = details.filter(d => (d.varianceQty || 0) !== 0 && d.physicalQty !== null);
      for (const detail of variances) {
        await db.insert(stock_adjustments).values({
          companyId, countId: id, itemId: detail.itemId, warehouseId: countRecord[0].warehouseId,
          adjustmentQty: detail.varianceQty || 0, reason: detail.varianceReason || 'Physical count variance',
          adjustedFromQty: detail.systemQty, adjustedToQty: detail.physicalQty || 0,
          adjustedByUid: req.user.uid, approvedByUid: req.user.uid, status: 'Approved',
        });
        if (detail.warehouseStockId) {
          await db.update(warehouse_stock).set({ quantity: detail.physicalQty || 0, lastUpdated: new Date() }).where(eq(warehouse_stock.id, detail.warehouseStockId));
        }
        const item = await db.select().from(inventory_items).where(eq(inventory_items.id, detail.itemId)).limit(1);
        if (item.length > 0) {
          const newGlobalQty = Math.max(0, (item[0].quantityInStock || 0) + (detail.varianceQty || 0));
          await db.update(inventory_items).set({ quantityInStock: newGlobalQty }).where(eq(inventory_items.id, detail.itemId));
        }
        await db.update(physical_count_details).set({ adjusted: true }).where(eq(physical_count_details.id, detail.id));
      }
      await db.update(physical_stock_counts).set({ status: 'Approved', approvedByUid: req.user.uid, approvedAt: new Date() }).where(eq(physical_stock_counts.id, id));
      res.json({ success: true, adjustmentsApplied: variances.length });
    } catch (e: any) { res.status(500).json({ error: "Failed to approve count: " + e.message }); }
  });

  app.get("/api/inventory/stock-adjustments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const adjustments = await db.select({ adjustment: stock_adjustments, item: inventory_items, warehouse: warehouses })
        .from(stock_adjustments)
        .leftJoin(inventory_items, eq(stock_adjustments.itemId, inventory_items.id))
        .leftJoin(warehouses, eq(stock_adjustments.warehouseId, warehouses.id))
        .where(eq(stock_adjustments.companyId, companyId))
        .orderBy(desc(stock_adjustments.createdAt));
      res.json(adjustments.map(r => ({ ...r.adjustment, itemName: r.item?.name, warehouseName: r.warehouse?.name })));
    } catch (e) { res.status(500).json({ error: "Failed to fetch adjustments" }); }
  });

  app.get("/api/vendors/quality-metrics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const metrics = await db.select({ metric: vendor_quality_metrics, vendor: vendors })
        .from(vendor_quality_metrics)
        .leftJoin(vendors, eq(vendor_quality_metrics.vendorId, vendors.id))
        .where(eq(vendor_quality_metrics.companyId, companyId))
        .orderBy(desc(vendor_quality_metrics.updatedAt));
      res.json(metrics.map(r => ({ ...r.metric, vendorName: r.vendor?.name })));
    } catch (e) { res.status(500).json({ error: "Failed to fetch vendor quality metrics" }); }
  });

  app.patch("/api/inventory/items/:id/reorder-config", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const itemId = parseInt(req.params.id);
      const { reorderPoint, reorderQuantity, leadTimeDays, safetyStockDays, abcClassification } = req.body;
      await db.update(inventory_items).set({
        reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : undefined,
        reorderQuantity: reorderQuantity !== undefined ? Number(reorderQuantity) : undefined,
        leadTimeDays: leadTimeDays !== undefined ? Number(leadTimeDays) : undefined,
        safetyStockDays: safetyStockDays !== undefined ? Number(safetyStockDays) : undefined,
        abcClassification: abcClassification || undefined,
      }).where(eq(inventory_items.id, itemId));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to update reorder config" }); }
  });

  app.get("/api/inventory/consumption-history/:itemId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const itemId = parseInt(req.params.itemId);
      const history = await db.select().from(stock_consumption_history).where(and(
        eq(stock_consumption_history.companyId, companyId),
        eq(stock_consumption_history.itemId, itemId),
      )).orderBy(desc(stock_consumption_history.createdAt)).limit(90);
      res.json(history);
    } catch (e) { res.status(500).json({ error: "Failed to fetch consumption history" }); }
  });

  // --- PHASE 2: AUTOMATED PR GENERATION FOR LOW STOCK ITEMS ---
  app.post("/api/inventory/auto-reorder/generate-pr", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.status(403).json({ error: "No company context" });

      const { itemIds } = req.body; // Optional array of itemIds to reorder

      // Fetch items that are low in stock
      const allItems = await db.select().from(inventory_items).where(eq(inventory_items.companyId, companyId));
      const lowStockItems = allItems.filter(item => {
        if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
          return itemIds.includes(item.id);
        }
        return item.reorderPoint > 0 && (item.quantityInStock || 0) <= item.reorderPoint;
      });

      if (lowStockItems.length === 0) {
        return res.status(400).json({ error: "No low-stock items eligible for auto-reorder." });
      }

      // Generate PR Number
      const prCountRes = await db.select({ count: sql<number>`count(*)` }).from(purchase_requisitions).where(eq(purchase_requisitions.companyId, companyId));
      const prSeq = Number(prCountRes[0].count) + 1;
      const prNumber = `PR-AUTO-${Date.now()}`;

      const dbUser = await db.select().from(users).where(eq(users.uid, req.user.uid)).limit(1);

      // Create Draft Purchase Requisition
      const newPr = await db.insert(purchase_requisitions).values({
        companyId,
        prNumber,
        requestor: dbUser[0]?.name || req.user.email || 'System Auto-Reorder',
        uid: req.user.uid,
        department: dbUser[0]?.department || 'Inventory Management',
        priority: 'High',
        estimatedCost: "0",
        justification: `Auto-generated Purchase Requisition for ${lowStockItems.length} low-stock item(s).`,
        status: 'Draft',
      }).returning();

      const prId = newPr[0].id;
      let totalEstCost = 0;

      // Insert PR items
      const prItemInserts = lowStockItems.map(item => {
        const orderQty = item.reorderQuantity > 0 ? item.reorderQuantity : Math.max(10, item.reorderPoint * 2);
        const unitPrice = Number(item.basePrice || 0);
        totalEstCost += orderQty * unitPrice;

        return {
          prId,
          itemId: item.id,
          itemName: item.name,
          uom: item.uom || 'Pcs',
          quantity: orderQty,
          unitPrice: String(unitPrice),
          totalPrice: String(orderQty * unitPrice),
          justification: `Auto-reorder trigger: Stock (${item.quantityInStock}) <= Reorder Point (${item.reorderPoint})`,
        };
      });

      await db.insert(pr_items).values(prItemInserts);

      // Update PR total cost
      await db.update(purchase_requisitions).set({ estimatedCost: String(totalEstCost) }).where(eq(purchase_requisitions.id, prId));

      res.json({ success: true, prId, prNumber, itemCount: lowStockItems.length, estimatedCost: totalEstCost });
    } catch (e: any) {
      console.error("Auto-reorder PR error:", e);
      res.status(500).json({ error: "Failed to generate auto-reorder PR: " + e.message });
    }
  });

  // --- PHASE 2: EXPIRING ITEMS & FEFO BATCHES ---
  app.get("/api/inventory/expiring-items", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);
      if (!companyId) return res.json([]);
      const days = parseInt(req.query.days as string) || 90;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const items = await db.select({
        stock: warehouse_stock,
        item: inventory_items,
        warehouse: warehouses,
      })
        .from(warehouse_stock)
        .innerJoin(inventory_items, eq(warehouse_stock.itemId, inventory_items.id))
        .leftJoin(warehouses, eq(warehouse_stock.warehouseId, warehouses.id))
        .where(and(
          eq(warehouse_stock.companyId, companyId),
          sql`${warehouse_stock.expiryDate} IS NOT NULL`,
          sql`${warehouse_stock.expiryDate} <= ${targetDate}`
        ))
        .orderBy(warehouse_stock.expiryDate);

      res.json(items.map(r => {
        const exp = new Date(r.stock.expiryDate!);
        const diffDays = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return {
          ...r.stock,
          itemName: r.item.name,
          itemCode: r.item.itemCode,
          uom: r.item.uom,
          warehouseName: r.warehouse?.name,
          daysUntilExpiry: diffDays,
          urgency: diffDays <= 30 ? 'High' : diffDays <= 60 ? 'Medium' : 'Low',
        };
      }));
    } catch (e) { res.status(500).json({ error: "Failed to fetch expiring items" }); }
  });

  // --- PLUGINS API ENDPOINTS ---
  app.get("/api/plugins/active", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = await resolveTenantId(req);

      // Auto-seed plugins table if missing
      const allPlugins = await db.select().from(plugins);
      const pluginSlugs = allPlugins.map(p => p.slug);
      
      const defaultPlugins = [
        { slug: 'procurement', name: 'Procurement', description: 'Manage Item requisitions, orders, and vendors.' },
        { slug: 'inventory', name: 'Inventory', description: 'Track stock, items, and warehouse management.' },
        { slug: 'asset-management', name: 'Asset Management', description: 'Fixed asset register, depreciation, and lifecycle.' }
      ];

      for (const dp of defaultPlugins) {
        if (!pluginSlugs.includes(dp.slug)) {
          await db.insert(plugins).values({
            slug: dp.slug,
            name: dp.name,
            description: dp.description,
            isCore: false
          }).onConflictDoNothing();
        }
      }

      const updatedPlugins = await db.select().from(plugins);

      if (!companyId) {
        return res.json({ plugins: updatedPlugins });
      }

      const companyPlugins = await db.select({
        id: plugins.id,
        slug: plugins.slug,
        name: plugins.name,
        description: plugins.description,
        status: company_plugins.status,
        settings: company_plugins.settings
      })
      .from(company_plugins)
      .innerJoin(plugins, eq(company_plugins.pluginId, plugins.id))
      .where(and(
        eq(company_plugins.companyId, companyId),
        eq(company_plugins.status, 'active')
      ));

      if (companyPlugins.length === 0) {
        for (const p of updatedPlugins) {
          await db.insert(company_plugins).values({
            companyId,
            pluginId: p.id,
            status: 'active',
            settings: {}
          }).onConflictDoNothing();
        }
        return res.json({ plugins: updatedPlugins });
      }

      // Ensure asset-management plugin is returned
      const hasAssetPlugin = companyPlugins.some(cp => cp.slug === 'asset-management');
      if (!hasAssetPlugin) {
        const assetObj = updatedPlugins.find(p => p.slug === 'asset-management');
        if (assetObj) {
          await db.insert(company_plugins).values({
            companyId,
            pluginId: assetObj.id,
            status: 'active',
            settings: {}
          }).onConflictDoNothing();
          companyPlugins.push({
            id: assetObj.id,
            slug: assetObj.slug,
            name: assetObj.name,
            description: assetObj.description,
            status: 'active',
            settings: {}
          });
        }
      }

      res.json({ plugins: companyPlugins });
    } catch (e: any) {
      console.error("Failed to fetch active plugins:", e);
      res.json({
        plugins: [
          { slug: 'procurement', name: 'Procurement' },
          { slug: 'inventory', name: 'Inventory' },
          { slug: 'asset-management', name: 'Asset Management' }
        ]
      });
    }
  });

  app.get("/api/plugins/manage", requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = (req.query.companyId as string) || (await resolveTenantId(req));
      const allPlugins = await db.select().from(plugins);
      if (!companyId) return res.json({ plugins: allPlugins });

      const cPlugins = await db.select().from(company_plugins).where(eq(company_plugins.companyId, companyId));
      const result = allPlugins.map(p => {
        const cp = cPlugins.find(c => c.pluginId === p.id);
        return {
          ...p,
          status: cp ? cp.status : 'active',
          settings: cp ? cp.settings : {}
        };
      });
      res.json({ plugins: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/plugins/manage/:id/toggle", requireAuth, async (req: AuthRequest, res) => {
    try {
      const pluginId = req.params.id;
      const companyId = (req.query.companyId as string) || (await resolveTenantId(req));
      const { status } = req.body;
      if (!companyId) return res.status(400).json({ error: "Missing company context" });

      await db.insert(company_plugins).values({
        companyId,
        pluginId,
        status: status || 'active'
      }).onConflictDoUpdate({
        target: [company_plugins.companyId, company_plugins.pluginId],
        set: { status: status || 'active' }
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Asset Management Domain Routers
  app.use('/api/assets/reports', assetReportsRouter);
  app.use('/api/assets', assetsRouter);

  // ================================================================
  // END PHASE 1 ROUTES
  // ================================================================

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL && !process.env.VITEST && process.env.NODE_ENV !== "test") {
    // Hide the import from Vercel's bundler to prevent it from bundling Vite and crashing on Invalid URL
    const viteModule = await new Function("return import('vite')")();
    const createViteServer = viteModule.createServer;
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.get('/api/nuke-cs', async (req, res) => {
    await db.delete(bpmn_definitions).where(eq(bpmn_definitions.documentType, 'CS Evaluation'));
    res.send("Nuked");
  });

  if (!process.env.VERCEL && !process.env.VITEST && process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
