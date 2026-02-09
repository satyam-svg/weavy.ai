import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { AddNodeRunBody, NodeRunDto } from '@/lib/api-types';

function toDto(nr: {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await getCurrentUser();
    const { runId } = await params;
    const body = (await request.json()) as AddNodeRunBody;

    const nodeRun = await prisma.nodeRun.create({
      data: {
        workflowRunId: runId,
        nodeId: body.nodeId,
        nodeName: body.nodeName,
        nodeType: body.nodeType,
        status: 'running',
        inputData: (body.inputData as object) ?? undefined,
      },
    });

    return NextResponse.json({ nodeRun: toDto(nodeRun) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('POST /api/history/runs/[runId]/nodes:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
