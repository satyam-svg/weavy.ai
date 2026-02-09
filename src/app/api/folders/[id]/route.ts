import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { UpdateFolderBody, FolderDetail } from '@/lib/api-types';

function toDetail(f: {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { workflows: number };
}): FolderDetail {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    fileCount: f._count.workflows,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const folder = await prisma.folder.findFirst({
      where: { id, userId: user.id },
      include: { _count: { select: { workflows: true } } },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder: toDetail(folder) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/folders/[id]:', err);
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
    const body = (await request.json()) as UpdateFolderBody;

    const existing = await prisma.folder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const data: Parameters<typeof prisma.folder.update>[0]['data'] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.parentId !== undefined) data.parentId = body.parentId;

    const folder = await prisma.folder.update({
      where: { id },
      data,
      include: { _count: { select: { workflows: true } } },
    });

    return NextResponse.json({ folder: toDetail(folder) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('PATCH /api/folders/[id]:', err);
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

    const existing = await prisma.folder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    await prisma.workflow.updateMany({
      where: { userId: user.id, folderId: id },
      data: { folderId: null },
    });
    await prisma.folder.updateMany({
      where: { userId: user.id, parentId: id },
      data: { parentId: null },
    });
    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('DELETE /api/folders/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
