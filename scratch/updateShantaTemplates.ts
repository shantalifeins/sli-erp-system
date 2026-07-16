import { config } from 'dotenv';
config({ path: '../.env' });
config({ path: '.env' });
import { db } from '../src/shared/db';
import { companies, notification_settings } from '../src/shared/db/schema';
import { eq, ilike } from 'drizzle-orm';

const APP_URL = process.env.APP_URL || 'https://sli-erp-system-3gt1vf95s-shanta-life.vercel.app';

const PROFESSIONAL_TEMPLATES: Record<string, { subject: string, body: string }> = {
  "User Created": {
    subject: "Welcome to Shanta Life ERP - Account Created",
    body: `Dear {{name}},

Welcome to the Shanta Life ERP System!

An account has been successfully provisioned for you. Please find your secure login credentials below:

--------------------------------------------------
Login URL: ${APP_URL}/login
Email/Username: {{email}}
Temporary Password: {{password}}
--------------------------------------------------

For security purposes, we highly recommend that you change your password immediately upon your first login.

If you encounter any issues accessing your account, please contact the IT Service Desk.

Best Regards,
System Administrator
Shanta Life ERP System`
  },
  "Profile Update Approved": {
    subject: "Profile Update Request Approved",
    body: `Dear {{name}},

We are writing to inform you that your recent profile update request has been successfully reviewed and approved by HR/Administration.

Your profile information in the Shanta Life ERP System has been updated accordingly.

You can view your updated profile by logging into the system: ${APP_URL}/profile

Best Regards,
Human Resources
Shanta Life ERP System`
  },
  "Profile Update Rejected": {
    subject: "Action Required: Profile Update Request Rejected",
    body: `Dear {{name}},

We are writing to inform you that your recent profile update request has been reviewed but could not be approved at this time.

Please log in to the ERP System to review the administrator's feedback or submit a new request if necessary:
${APP_URL}/profile

If you have any questions regarding this decision, please contact HR/Administration.

Best Regards,
Human Resources
Shanta Life ERP System`
  },
  "Profile Update Required": {
    subject: "Action Required: Pending Profile Update Request",
    body: `Dear Approver,

A new profile data change request has been submitted by {{name}} and requires your administrative review.

Please log in to the Shanta Life ERP System at your earliest convenience to review the requested changes and take the necessary action (Approve/Reject).

Access your Global Tasks Inbox here: ${APP_URL}/inbox

Best Regards,
System Workflow Automation
Shanta Life ERP System`
  },
  "Item Requisition Approval Required": {
    subject: "Action Required: Item Requisition {{reference}} Pending Approval",
    body: `Dear Approver,

An Item Requisition (Reference: {{reference}}) has been submitted and is currently pending your approval in the workflow.

Please review the requisition details and take appropriate action to ensure timely processing.

You can view and action this request directly in your Global Tasks Inbox:
${APP_URL}/inbox

Best Regards,
Procurement & Inventory Operations
Shanta Life ERP System`
  },
  "Item Request Created": {
    subject: "Confirmation: Item Requisition {{reference}} Submitted",
    body: `Dear User,

This is a confirmation that your Item Requisition (Reference: {{reference}}) has been successfully submitted to the Shanta Life ERP System.

No further managerial approvals are required for this specific request. The inventory team has been notified and will process your request shortly.

You can track the status of your requisition here: ${APP_URL}/inventory-requisition-list

Best Regards,
Inventory Operations
Shanta Life ERP System`
  },
  "Item Requisition Created": {
    subject: "Confirmation: Item Requisition {{reference}} Submitted",
    body: `Dear User,

This is a confirmation that your Item Requisition (Reference: {{reference}}) has been successfully recorded in the Shanta Life ERP System.

The request has been routed to the appropriate approvers based on the organizational workflow. You will be notified once a decision has been made.

Track your requisition status here: ${APP_URL}/inventory-requisition-list

Best Regards,
Inventory Operations
Shanta Life ERP System`
  },
  "PR Rejected": {
    subject: "Update: Purchase Requisition {{reference}} Rejected",
    body: `Dear User,

We regret to inform you that your Purchase Requisition (Reference: {{reference}}) has been rejected during the review process.

Please log in to the system to view any comments or feedback provided by the approver. If required, you may need to submit a new requisition with the necessary corrections.

View details here: ${APP_URL}/requisition-list

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "PR Revision Required": {
    subject: "Action Required: Purchase Requisition {{reference}} Sent Back for Revision",
    body: `Dear User,

Your Purchase Requisition (Reference: {{reference}}) has been reviewed and sent back for necessary revisions.

Approver Feedback: 
"{{comments}}"

Please log in to the Shanta Life ERP System, update the requisition according to the feedback provided, and resubmit it to continue the workflow.

Access your document here: ${APP_URL}/requisition-list

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "PR Approved": {
    subject: "Success: Purchase Requisition {{reference}} Approved",
    body: `Dear User,

We are pleased to inform you that your Purchase Requisition (Reference: {{reference}}) has been fully approved by all designated authorities.

The document will now move forward to the next stage in the procurement lifecycle (CS Evaluation / PO Generation).

You can review the approved document here: ${APP_URL}/requisition-list

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "PR Approval Required": {
    subject: "Action Required: Purchase Requisition {{reference}} Pending Approval",
    body: `Dear Approver,

A Purchase Requisition (Reference: {{reference}}) has been submitted and requires your mandatory review and approval.

To prevent any delays in the procurement process, please log in to the Shanta Life ERP System and action this request at your earliest convenience.

Access your Global Tasks Inbox here: ${APP_URL}/inbox

Best Regards,
Workflow Automation
Shanta Life ERP System`
  },
  "CS Evaluation Approval Required": {
    subject: "Action Required: CS Evaluation {{reference}} Pending Approval",
    body: `Dear Approver,

A Comparative Statement (CS) Evaluation (Reference: {{reference}}) has been prepared by the procurement team and requires your administrative review and approval.

Please review the vendor comparisons, pricing, and compliance criteria before making your decision.

Access the evaluation in your Global Tasks Inbox here: ${APP_URL}/inbox

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "PO Approval Required": {
    subject: "Action Required: Purchase Order {{reference}} Pending Approval",
    body: `Dear Approver,

A new Purchase Order (Reference: {{reference}}) has been generated and requires your final approval before dispatch to the vendor.

Please verify the terms, quantities, and financial details.

Review and action the Purchase Order in your Global Tasks Inbox:
${APP_URL}/inbox

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "PO Created": {
    subject: "Notification: Purchase Order {{reference}} Generated",
    body: `Dear User,

This is an automated notification to inform you that Purchase Order (Reference: {{reference}}) has been successfully generated and auto-approved in the system.

The PO is now ready for vendor distribution and subsequent Goods Receipt processing.

View the PO details here: ${APP_URL}/po-list

Best Regards,
Procurement Department
Shanta Life ERP System`
  },
  "GRN Created": {
    subject: "Notification: Goods Receipt Note (GRN) Recorded for {{reference}}",
    body: `Dear User,

This is to confirm that a Goods Receipt Note (GRN) has been successfully recorded in the system against Purchase Order {{reference}}.

The received items have been logged into the designated warehouse inventory.

You can view the receipt details here: ${APP_URL}/grn-list

Best Regards,
Warehouse Operations
Shanta Life ERP System`
  },
  "Invoice Created": {
    subject: "Notification: Vendor Invoice Recorded",
    body: `Dear User,

A vendor invoice has been successfully recorded and linked to your procurement workflow.

The finance team will process the payment according to the agreed terms.

Best Regards,
Accounts Payable
Shanta Life ERP System`
  },
  "Payment Created": {
    subject: "Notification: Payment Processed",
    body: `Dear User,

This is to confirm that a payment has been successfully processed against the recorded vendor invoice.

Best Regards,
Accounts Payable
Shanta Life ERP System`
  },
  "Stock Transfer Created": {
    subject: "Notification: Stock Transfer Initiated",
    body: `Dear User,

A new stock transfer request has been initiated between warehouses. 

Please log in to the ERP system to track the shipment and acknowledge receipt once the items arrive at the destination warehouse.

Best Regards,
Logistics & Inventory Operations
Shanta Life ERP System`
  },
  "Stock Out Approval Required": {
    subject: "Action Required: Stock Out Request Pending Approval",
    body: `Dear Approver,

A Stock Out Request has been submitted and is currently pending your managerial approval.

Please review the requested inventory items, quantities, and justifications before authorizing the release from the warehouse.

Access your Global Tasks Inbox here to take action:
${APP_URL}/inbox

Best Regards,
Warehouse Operations
Shanta Life ERP System`
  },
  "Stock Out Approved": {
    subject: "Update: Stock Out Request Approved",
    body: `Dear User,

Your recent Stock Out Request has been fully approved. 

The warehouse team has been notified and will prepare the requested items for release.

Best Regards,
Warehouse Operations
Shanta Life ERP System`
  },
  "Stock Out Rejected": {
    subject: "Update: Stock Out Request Rejected",
    body: `Dear User,

We regret to inform you that your recent Stock Out Request has been rejected.

Please log in to the system to review any comments provided by the approver.

Best Regards,
Warehouse Operations
Shanta Life ERP System`
  },
  "Reorder Alert": {
    subject: "Alert: Inventory Reorder Level Reached",
    body: `Dear Warehouse Manager,

This is an automated system alert to notify you that one or more items in your warehouse have reached or fallen below their minimum reorder threshold.

Please log in to the ERP system to review the current stock levels and initiate a Purchase Requisition if necessary to prevent stockouts.

Best Regards,
System Automation
Shanta Life ERP System`
  }
};

async function updateTemplates() {
  const companyList = await db.select().from(companies).where(ilike(companies.name, '%shanta%'));
  console.log("Found companies:", companyList.map(c => ({id: c.id, name: c.name})));
  
  if (companyList.length === 0) {
    console.log("No company found matching 'shanta'");
    process.exit(1);
  }

  const companyId = companyList[0].id;
  
  const MODULE_MAP: Record<string, string> = {
    "User Created": "Administration",
    "Profile Update Approved": "Administration",
    "Profile Update Rejected": "Administration",
    "Profile Update Required": "Administration",
    "Item Requisition Approval Required": "Procurement",
    "Item Request Created": "Procurement",
    "Item Requisition Created": "Procurement",
    "PR Rejected": "Procurement",
    "PR Revision Required": "Procurement",
    "PR Approved": "Procurement",
    "PR Approval Required": "Procurement",
    "CS Evaluation Approval Required": "Procurement",
    "PO Approval Required": "Procurement",
    "PO Created": "Procurement",
    "GRN Created": "Inventory",
    "Invoice Created": "Accounts",
    "Payment Created": "Accounts",
    "Stock Transfer Created": "Inventory",
    "Stock Out Approval Required": "Inventory",
    "Stock Out Approved": "Inventory",
    "Stock Out Rejected": "Inventory",
    "Reorder Alert": "Inventory"
  };

  const existingSettings = await db.select().from(notification_settings).where(eq(notification_settings.companyId, companyId));
  console.log("Found " + existingSettings.length + " existing settings for company " + companyList[0].name);

  for (const [actionEvent, profTemplate] of Object.entries(PROFESSIONAL_TEMPLATES)) {
    const existing = existingSettings.find(s => s.actionEvent === actionEvent);
    
    if (existing) {
      await db.update(notification_settings)
        .set({
          mailSubjectTemplate: profTemplate.subject,
          mailBodyTemplate: profTemplate.body
        })
        .where(eq(notification_settings.id, existing.id));
      console.log("Updated existing template for " + actionEvent);
    } else {
      await db.insert(notification_settings).values({
        companyId,
        actionEvent,
        module: MODULE_MAP[actionEvent] || 'General',
        titleTemplate: actionEvent,
        bodyTemplate: actionEvent,
        mailSubjectTemplate: profTemplate.subject,
        mailBodyTemplate: profTemplate.body,
        isActive: true,
        isMailActive: true
      });
      console.log("Inserted new template for " + actionEvent);
    }
  }
  
  console.log("Finished updating templates");
  process.exit(0);
}

// We need to compile or run this carefully since it imports from server.ts which imports express etc.
// Actually running it via tsx or ts-node is best.
updateTemplates().catch(console.error);
