import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import { uploadFileToTransloadit } from '@/lib/transloadit-server';

const ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg', ''];
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.mpeg', '.mpg'];

function isVideoFile(file: File): boolean {
  if (ALLOWED_MIMES.includes(file.type)) return true;
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.some((e) => ext === e);
}

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
    if (!isVideoFile(file)) {
      return NextResponse.json({ error: 'Invalid video type' }, { status: 400 });
    }

    const result = await uploadFileToTransloadit(file, 'video');
    if (!result) {
      return NextResponse.json({ error: 'Upload to Transloadit failed' }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/upload/video:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
