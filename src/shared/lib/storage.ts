import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const SUPABASE_BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'attachments';
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface StoredFile {
  storagePath: string;
  storageProvider: 'local' | 'supabase';
  publicUrl?: string;
}

function isSupabaseMode(): boolean {
  return process.env.AUTH_MODE === 'supabase';
}

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function validateFile(mimeType: string | undefined, sizeBytes: number): void {
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Maximum allowed: ${MAX_SIZE_BYTES / 1024 / 1024} MB`);
  }
}

export async function storeFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  companyId: string
): Promise<StoredFile> {
  const ext = path.extname(originalName);
  const safeName = crypto.randomUUID() + ext;
  const storagePath = `${companyId}/${safeName}`;

  if (isSupabaseMode()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);

    return { storagePath, storageProvider: 'supabase', publicUrl: data.publicUrl };
  } else {
    // Local disk
    const dir = path.join(UPLOADS_DIR, companyId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, safeName), buffer);
    return { storagePath, storageProvider: 'local' };
  }
}

export async function deleteFile(storagePath: string, storageProvider: string): Promise<void> {
  if (storageProvider === 'supabase') {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);
    if (error) console.error('Supabase delete error (non-fatal):', error.message);
  } else {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    try { fs.unlinkSync(fullPath); } catch { /* File already gone — OK */ }
  }
}

export async function getFileBuffer(storagePath: string, storageProvider: string): Promise<Buffer> {
  if (storageProvider === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(storagePath);
    if (error) throw new Error(`Supabase download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  } else {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    return fs.readFileSync(fullPath);
  }
}
