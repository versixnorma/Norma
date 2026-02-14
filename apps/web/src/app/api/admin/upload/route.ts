import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Auth check - any logged-in user can upload
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const admin = createAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);

  return NextResponse.json({ data: { url: urlData.publicUrl } });
}
