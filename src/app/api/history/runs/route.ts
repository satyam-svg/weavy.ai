import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import { createRunSchema, parseBody } from '@/lib/api-schemas';
import type { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = parseBody<z.infer<typeof createRunSchema>>(createRunSchema.safeParse(raw));
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

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
