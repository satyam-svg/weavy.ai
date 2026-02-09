import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { CreateWorkflowBody, WorkflowListItem } from '@/lib/api-types';

function toListItem(w: { id: string; name: string; thumbnail: string | null; folderId: string | null; createdAt: Date; updatedAt: Date }): WorkflowListItem {
  return {
    id: w.id,
    name: w.name,
    thumbnail: w.thumbnail,
    folderId: w.folderId,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const folderId = request.nextUrl.searchParams.get('folderId') ?? undefined;

    const where: { userId: string; folderId?: string | null } = { userId: user.id };
    if (folderId !== undefined) {
      where.folderId = folderId === '' ? null : folderId;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ workflows: workflows.map(toListItem) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/workflows:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as CreateWorkflowBody;

    const name = body.name ?? 'untitled';
    const folderId = body.folderId ?? null;
    const nodes = body.nodes ?? [];
    const edges = body.edges ?? [];

    const workflow = await prisma.workflow.create({
      data: {
        name,
        folderId,
        nodes: nodes as Prisma.InputJsonValue,
        edges: edges as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Workflow created:', workflow.id);
    }

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        folderId: workflow.folderId,
        nodes: workflow.nodes,
        edges: workflow.edges,
        thumbnail: workflow.thumbnail,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('POST /api/workflows:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
