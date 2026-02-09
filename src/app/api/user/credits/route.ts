import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import prisma from '@/lib/db';

/**
 * GET /api/user/credits
 * Returns current user's credit balance (for real-time display in dashboard/workflow).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalCredit: true },
    });

    const totalCredit = dbUser?.totalCredit ?? 100;

    return NextResponse.json({ totalCredit });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('GET /api/user/credits:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
