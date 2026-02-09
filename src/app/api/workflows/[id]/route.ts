import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { UpdateWorkflowBody, WorkflowDetail } from '@/lib/api-types';

function toDetail(w: {
  id: string;
  name: string;
  folderId: string | null;
  nodes: unknown;
  edges: unknown;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowDetail {
  return {
    id: w.id,
    name: w.name,
    folderId: w.folderId,
    nodes: w.nodes,
    edges: w.edges,
    thumbnail: w.thumbnail,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: user.id },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow: toDetail(workflow) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/workflows/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = (await request.json()) as UpdateWorkflowBody;

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const data: Parameters<typeof prisma.workflow.update>[0]['data'] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.folderId !== undefined) data.folderId = body.folderId;
    if (body.nodes !== undefined) data.nodes = body.nodes as Prisma.InputJsonValue;
    if (body.edges !== undefined) data.edges = body.edges as Prisma.InputJsonValue;
    if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail;

    const workflow = await prisma.workflow.update({
      where: { id },
      data,
    });

    return NextResponse.json({ workflow: toDetail(workflow) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('PATCH /api/workflows/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    await prisma.workflow.delete({ where: { id } });
    return NextResponse.json({ message: 'Workflow deleted successfully' });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('DELETE /api/workflows/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
