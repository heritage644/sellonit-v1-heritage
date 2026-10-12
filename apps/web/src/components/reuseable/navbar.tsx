import Link from 'next/link';
import { Logo } from './logo';

/** Top bar used on the landing page: logo on the left, nothing else to distract. */
export default function Navbar() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
      <Link
        href="/"
        aria-label="Sellonit home"
        className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
      >
        <Logo />
      </Link>
    </header>
  );
}
