import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import { uploadFileToTransloadit } from '@/lib/transloadit-server';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser();
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw e;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    const result = await uploadFileToTransloadit(file, 'image');
    if (!result) {
      return NextResponse.json({ error: 'Upload to Transloadit failed' }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/upload/image:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
