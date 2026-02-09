/**
 * API Auth Helper
 *
 * Gets current user from Clerk and DB for use in API route handlers.
 * Throws if not authenticated.
 */

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';

export interface ApiUser {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  avatar: string | null;
  totalCredit: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the current authenticated user (Clerk + DB).
 * Auto-creates user in DB if not found (e.g. before webhooks).
 * @throws if not signed in or user cannot be created
 */
export async function getCurrentUser(): Promise<ApiUser> {
  const { userId } = await auth();

  if (!userId) {
    const error = new Error('Authentication required');
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  let user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    );
    const email =
      primaryEmail?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      const err = new Error('No email found for user');
      (err as Error & { statusCode?: number }).statusCode = 401;
      throw err;
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email.split('@')[0];

    user = await prisma.user.create({
      data: {
        clerkUserId: userId,
        email,
        name,
        avatar: clerkUser.imageUrl ?? null,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Auto-created user:', email);
    }
  }

  return user as ApiUser;
}
