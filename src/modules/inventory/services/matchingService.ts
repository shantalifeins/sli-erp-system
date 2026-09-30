import { db } from '../../../shared/db/index.js';
import { invoices, invoice_items, po_items, grn_items } from '../../../shared/db/schema.js';
import { eq } from 'drizzle-orm';

export const matchingService = {
  async matchInvoice(invoiceId: number, reqUserUid: string) {
    return await db.transaction(async (tx: any) => {
      const invRecord = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!invRecord.length) throw new Error('Invoice not found');
      
      const items = await tx.select().from(invoice_items).where(eq(invoice_items.invoiceId, invoiceId));
      if (!items.length) {
        await tx.update(invoices).set({ matchStatus: 'Mismatched', matchingNotes: 'No lines' }).where(eq(invoices.id, invoiceId));
        return 'Mismatched';
      }

      let allMatched = true;
      let notes: string[] = [];

      for (const item of items) {
        if (!item.poItemId) {
           allMatched = false;
           notes.push(`Item ${item.id} has no PO linkage`);
           continue;
        }

        const poItem = await tx.select().from(po_items).where(eq(po_items.id, item.poItemId));
        if (!poItem.length) {
           allMatched = false;
           notes.push(`PO line missing for item ${item.id}`);
           continue;
        }

        // Qty tolerance: 0%
        let targetQty = Number(poItem[0].quantity);
        if (item.grnItemId) {
           const grnItem = await tx.select().from(grn_items).where(eq(grn_items.id, item.grnItemId));
           if (grnItem.length) targetQty = Number(grnItem[0].quantityReceived);
        }

        const invQty = Number(item.quantity);
        if (invQty !== targetQty) {
           allMatched = false;
           notes.push(`Qty mismatch on line ${item.id} (PO/GRN: ${targetQty}, Inv: ${invQty})`);
        }

        // Price tolerance: ±3%
        const poPrice = Number(poItem[0].unitPrice);
        const invPrice = Number(item.unitPrice);
        const diffPercent = poPrice === 0 ? (invPrice === 0 ? 0 : 100) : Math.abs(invPrice - poPrice) / poPrice * 100;
        
        if (diffPercent > 3) {
           allMatched = false;
           notes.push(`Price mismatch on line ${item.id} (PO: ${poPrice}, Inv: ${invPrice})`);
        }
      }

      const matchStatus = allMatched ? 'Matched' : 'Mismatched';
      await tx.update(invoices).set({ 
        matchStatus, 
        matchingNotes: notes.join('; ') || null
      }).where(eq(invoices.id, invoiceId));

      return matchStatus;
    });
  }
};
