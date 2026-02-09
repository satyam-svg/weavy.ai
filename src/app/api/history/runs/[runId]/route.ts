import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { UpdateRunBody, WorkflowRunDto, NodeRunDto } from '@/lib/api-types';

function nodeRunToDto(nr: {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  inputData: unknown;
  outputData: unknown;
  error: string | null;
}): NodeRunDto {
  return {
    id: nr.id,
    nodeId: nr.nodeId,
    nodeName: nr.nodeName,
    nodeType: nr.nodeType,
    status: nr.status,
    startedAt: nr.startedAt.toISOString(),
    completedAt: nr.completedAt?.toISOString() ?? null,
    duration: nr.duration,
    inputData: (nr.inputData as Record<string, unknown>) ?? null,
    outputData: (nr.outputData as Record<string, unknown>) ?? null,
    error: nr.error,
  };
}

function runToDto(r: {
  id: string;
  workflowId: string;
  runScope: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  nodeCount: number;
  nodeRuns: Array<{
    id: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    inputData: unknown;
    outputData: unknown;
    error: string | null;
  }>;
}): WorkflowRunDto {
  return {
    id: r.id,
    workflowId: r.workflowId,
    runScope: r.runScope,
    status: r.status,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    duration: r.duration,
    nodeCount: r.nodeCount,
    nodeRuns: r.nodeRuns.map(nodeRunToDto),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await getCurrentUser();
    const { runId } = await params;

    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        nodeRuns: { orderBy: { startedAt: 'asc' } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ run: runToDto(run) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/history/runs/[runId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CREDITS_PER_RUN = 5;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await getCurrentUser();
    const { runId } = await params;
    const body = (await request.json()) as UpdateRunBody;

    // Deduct credits only when run is marked completed (and was not already completed)
    if (body.status === 'completed') {
      const existing = await prisma.workflowRun.findUnique({
        where: { id: runId },
        include: { workflow: { select: { userId: true } } },
      });
      if (existing && existing.status !== 'completed' && existing.workflow?.userId) {
        await prisma.user.update({
          where: { id: existing.workflow.userId },
          data: {
            totalCredit: { decrement: CREDITS_PER_RUN },
          },
        });
        // Ensure we don't go below 0 (decrement can make negative in DB)
        await prisma.user.updateMany({
          where: { id: existing.workflow.userId, totalCredit: { lt: 0 } },
          data: { totalCredit: 0 },
        });
      }
    }

    const data: Parameters<typeof prisma.workflowRun.update>[0]['data'] = {
      status: body.status,
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
      duration: body.duration,
    };

    const run = await prisma.workflowRun.update({
      where: { id: runId },
      data,
      include: {
        nodeRuns: { orderBy: { startedAt: 'asc' } },
      },
    });

    return NextResponse.json({ run: runToDto(run) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('PATCH /api/history/runs/[runId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await getCurrentUser();
    const { runId } = await params;

    await prisma.workflowRun.delete({ where: { id: runId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('DELETE /api/history/runs/[runId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
