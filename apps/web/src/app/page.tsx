import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <span className="wordmark">Sellonit</span>
        <Link href="/auth/register" className="auth-nav">
          Create account
        </Link>
      </header>
      <main className="home-main">
        <h1 className="home-title">Sellonit</h1>
        <Link href="/auth/register" className="btn btn-primary home-cta">
          Create your account
        </Link>
      </main>
    </div>
  );
}
