import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Sellonit wordmark from `public/logo` (the orange-accent logo the brand uses). */
export const LOGO_SRC = '/logo/Wordmark%20SVG%20(1)%201.svg';

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Sellonit"
      width={160}
      height={36}
      priority
      unoptimized
      className={cn('h-7 w-auto sm:h-9', className)}
    />
  );
}
