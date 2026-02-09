import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { CreateRunBody } from '@/lib/api-types';

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser();
    const body = (await request.json()) as CreateRunBody;

    const { workflowId, runScope, nodeCount } = body;

    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        runScope,
        status: 'running',
        nodeCount,
      },
    });

    return NextResponse.json({
      run: {
        id: run.id,
        workflowId: run.workflowId,
        runScope: run.runScope,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        duration: run.duration,
        nodeCount: run.nodeCount,
      },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('POST /api/history/runs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
