import express from 'express';
import multer from 'multer';
import { db } from '../../../shared/db/index.js';
import { attachments } from '../../../shared/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { AuthRequest } from '../../../shared/middleware/auth.js';
import { resolveTenantId, requireTenant } from '../../../shared/lib/tenant.js';
import { requirePermission } from '../../../shared/middleware/permissions.js';
import { storeFile, deleteFile, getFileBuffer, validateFile } from '../../../shared/lib/storage.js';

const router = express.Router();

// Multer — memory storage (we handle writing ourselves via storage.ts)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard limit
});

// GET /api/attachments?refType=PO&refId=123
router.get('/', requirePermission('Attachments', 'canView'), async (req: AuthRequest, res) => {
  try {
    let companyId = await resolveTenantId(req);
    if (!requireTenant(companyId, res)) return;

    const { refType, refId } = req.query as { refType?: string; refId?: string };
    if (!refType || !refId) return res.status(400).json({ error: 'refType and refId are required' });

    const rows = await db.select({
      id: attachments.id,
      refType: attachments.refType,
      refId: attachments.refId,
      category: attachments.category,
      fileName: attachments.fileName,
      mimeType: attachments.mimeType,
      sizeBytes: attachments.sizeBytes,
      storageProvider: attachments.storageProvider,
      uploadedByUid: attachments.uploadedByUid,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.companyId, companyId),
        eq(attachments.refType, refType),
        eq(attachments.refId, refId),
        isNull(attachments.deletedAt)
      )
    )
    .orderBy(attachments.createdAt);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// POST /api/attachments — upload a file
router.post(
  '/',
  requirePermission('Attachments', 'canCreate'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      let companyId = await resolveTenantId(req);
      if (!requireTenant(companyId, res)) return;

      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { refType, refId, category } = req.body as {
        refType: string;
        refId: string;
        category?: string;
      };

      if (!refType || !refId) return res.status(400).json({ error: 'refType and refId are required' });

      // Validate MIME type and size
      try {
        validateFile(req.file.mimetype, req.file.size);
      } catch (e: any) {
        return res.status(422).json({ error: e.message });
      }

      // Store file
      const stored = await storeFile(req.file.buffer, req.file.originalname, req.file.mimetype, companyId);

      // Insert DB record
      const [record] = await db.insert(attachments).values({
        companyId,
        refType,
        refId,
        category: category || null,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: stored.storagePath,
        storageProvider: stored.storageProvider,
        uploadedByUid: req.user!.uid,
      }).returning();

      res.status(201).json({ ...record, publicUrl: stored.publicUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload attachment' });
    }
  }
);

// GET /api/attachments/:id/download
router.get('/:id/download', requirePermission('Attachments', 'canView'), async (req: AuthRequest, res) => {
  try {
    let companyId = await resolveTenantId(req);
    if (!requireTenant(companyId, res)) return;

    const { id } = req.params;
    const [record] = await db.select().from(attachments).where(
      and(eq(attachments.id, id), eq(attachments.companyId, companyId), isNull(attachments.deletedAt))
    ).limit(1);

    if (!record) return res.status(404).json({ error: 'Attachment not found' });

    const buffer = await getFileBuffer(record.storagePath!, record.storageProvider!);

    res.setHeader('Content-Disposition', `attachment; filename="${record.fileName}"`);
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// DELETE /api/attachments/:id — soft delete
router.delete('/:id', requirePermission('Attachments', 'canDelete'), async (req: AuthRequest, res) => {
  try {
    let companyId = await resolveTenantId(req);
    if (!requireTenant(companyId, res)) return;

    const { id } = req.params;
    const [record] = await db.select().from(attachments).where(
      and(eq(attachments.id, id), eq(attachments.companyId, companyId), isNull(attachments.deletedAt))
    ).limit(1);

    if (!record) return res.status(404).json({ error: 'Attachment not found' });

    // Soft delete
    await db.update(attachments)
      .set({ deletedAt: new Date() })
      .where(eq(attachments.id, id));

    // Also physically remove from storage
    if (record.storagePath) {
      await deleteFile(record.storagePath, record.storageProvider!);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default router;
