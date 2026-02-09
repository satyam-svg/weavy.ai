import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { NodeRunDto } from '@/lib/api-types';
import { updateNodeRunSchema, parseBody } from '@/lib/api-schemas';
import type { z } from 'zod';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nodeRunId: string }> }
) {
  try {
    await getCurrentUser();
    const { nodeRunId } = await params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = parseBody<z.infer<typeof updateNodeRunSchema>>(updateNodeRunSchema.safeParse(raw));
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const data: Parameters<typeof prisma.nodeRun.update>[0]['data'] = {
      status: body.status,
      completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
      duration: body.duration,
      outputData: body.outputData as object | undefined,
      error: body.error,
    };

    const nodeRun = await prisma.nodeRun.update({
      where: { id: nodeRunId },
      data,
    });

    return NextResponse.json({ nodeRun: toDto(nodeRun) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('PATCH /api/history/nodes/[nodeRunId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
