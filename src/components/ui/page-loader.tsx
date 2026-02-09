'use client';

import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface PageLoaderProps {
  /** Spinner size. Default: size-8. Use e.g. size-10 or size-12 for workflow page. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional custom class for the wrapper (e.g. for workflow page background). */
  className?: string;
}

const sizeClasses = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

/**
 * Full-screen loading state with white spinner.
 * Use on dashboard, workflow, and any page load.
 */
export function PageLoader({ size = 'sm', className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col items-center justify-center bg-[#0f0f0f]',
        className
      )}
    >
      <Spinner className={cn(sizeClasses[size], 'text-white')} />
    </div>
  );
}
