import { withAdminAuth } from '@/lib/api-helpers';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withAdminAuth(async ({ admin }, request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bucket = (formData.get('bucket') as string) || 'anexos';
  const path = formData.get('path') as string;

  if (!file || !path) {
    return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Maximo 5MB.' }, { status: 400 });
  }

  // Ensure bucket exists (auto-create if missing)
  const { data: buckets } = await admin.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.id === bucket);
  if (!bucketExists) {
    await admin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
      ],
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);

  return NextResponse.json({ data: { url: urlData.publicUrl } });
});
