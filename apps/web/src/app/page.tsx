import Link from 'next/link';
import Navbar from '@/components/reuseable/navbar';
import { buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pt-2 pb-12 text-center">
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          Sellonit
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
          Sell on Sellonit with your phone number. Create an account or log in to continue.
        </p>
        <div className="flex w-full max-w-[280px] flex-col gap-3 sm:max-w-xs">
          <Link
            href="/auth/register"
            className={buttonVariants({ size: 'lg', className: 'w-full' })}
          >
            Create your account
          </Link>
          <Link
            href="/auth/login"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
