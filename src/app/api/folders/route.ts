import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';
import type { CreateFolderBody, FolderListItem } from '@/lib/api-types';

function toListItem(f: {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { workflows: number };
}): FolderListItem {
  return {
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    fileCount: f._count.workflows,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const parentIdParam = request.nextUrl.searchParams.get('parentId');

    const where: { userId: string; parentId: string | null } = {
      userId: user.id,
      parentId: parentIdParam === undefined || parentIdParam === '' ? null : parentIdParam,
    };

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { workflows: true } },
      },
    });

    const items: FolderListItem[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      fileCount: f._count.workflows,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return NextResponse.json({ folders: items });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/folders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as CreateFolderBody;

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const parentId = body.parentId ?? null;

    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId: user.id },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
    }

    const folder = await prisma.folder.create({
      data: { name, parentId, userId: user.id },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Folder created:', folder.id);
    }

    return NextResponse.json({
      folder: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        fileCount: 0,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('POST /api/folders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
