import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    await getCurrentUser();
    const { workflowId } = await params;

    await prisma.workflowRun.deleteMany({
      where: { workflowId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('POST /api/history/workflows/[workflowId]/clear:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
