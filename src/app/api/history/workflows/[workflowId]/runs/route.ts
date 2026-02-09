import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { WorkflowRunDto, NodeRunDto } from '@/lib/api-types';

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
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    await getCurrentUser();
    const { workflowId } = await params;
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100);

    const runs = await prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        nodeRuns: { orderBy: { startedAt: 'asc' } },
      },
    });

    return NextResponse.json({
      runs: runs.map(runToDto),
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/history/workflows/[workflowId]/runs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
