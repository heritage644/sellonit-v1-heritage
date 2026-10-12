import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-control border border-input bg-card px-3.5 text-[15px] leading-none text-foreground outline-none transition-[color,box-shadow,border-color] placeholder:text-faint selection:bg-primary/30 disabled:cursor-not-allowed disabled:bg-field-bg disabled:text-faint',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/16',
        'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/14',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
