import cron from 'node-cron';
import { db } from '../db/index.js';
import { digital_assets, digital_asset_renewals, inbox_tasks } from '../db/schema.js';
import { eq, and, lte, lt } from 'drizzle-orm';
import { addDays } from 'date-fns';

export function startScheduler() {
  console.log('Starting daily background scheduler...');

  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily digital asset renewal checks...');
    try {
      const now = new Date();

      // 1. Mark Expired where serviceEndDate < now and status = Active
      await db.update(digital_assets)
        .set({ status: 'Expired' })
        .where(
          and(
            eq(digital_assets.status, 'Active'),
            lt(digital_assets.serviceEndDate, now)
          )
        );

      // 2. Set Pending Renewal where expiryDate <= now + renewalReminderDays
      // We need to fetch active assets to check their individual reminder days
      const activeAssets = await db.select().from(digital_assets).where(eq(digital_assets.status, 'Active'));

      for (const asset of activeAssets) {
        if (!asset.serviceEndDate || !asset.renewalReminderDays) continue;

        const reminderDate = new Date(asset.serviceEndDate);
        reminderDate.setDate(reminderDate.getDate() - asset.renewalReminderDays);

        if (now >= reminderDate && asset.autoRenewal) {
          // Transition to Pending Renewal
          await db.update(digital_assets)
            .set({ status: 'Pending Renewal' })
            .where(eq(digital_assets.id, asset.id));

          // 3. Create inbox task for custodian/IT role
          // Attempt to assign to custodian (createdByUid) or fallback to IT Role
          const assignedUid = asset.createdByUid || null;
          const assignedRole = assignedUid ? null : 'IT Admin';

          await db.insert(inbox_tasks).values({
            companyId: asset.companyId,
            referenceType: 'Digital Asset Renewal',
            referenceId: null, // digital_assets.id is UUID, inbox_tasks.referenceId is integer. We leave it null and rely on actionLink
            assignedToUid: assignedUid,
            assignedToRole: assignedRole,
            category: 'System',
            title: `Digital Asset Renewal Required: ${asset.name}`,
            message: `Asset ${asset.assetCode} is due for renewal on ${asset.serviceEndDate.toDateString()}`,
            actionLink: `/digital-assets/${asset.id}/renewal`,
            status: 'Pending',
          });
        }
      }
      console.log('Daily digital asset renewal checks completed successfully.');
    } catch (error) {
      console.error('Error during daily digital asset renewal checks:', error);
    }
  });
}
