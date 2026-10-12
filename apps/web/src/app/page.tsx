import Link from 'next/link';
import Navbar from '@/components/reuseable/navbar';
export default function HomePage() {
  return (
    <div className="auth-page">
    <Navbar/>
      <main className="home-main">
        <h1 className="home-title">Sellonit</h1>
        <Link href="/auth/register" className="btn btn-primary home-cta">
          Create your account
        </Link>
      </main>
    </div>
  );
}
