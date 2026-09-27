import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicEnv } from '@/config/public-env';
import './globals.css';

export const metadata: Metadata = {
  title: { default: publicEnv.appName, template: `%s · ${publicEnv.appName}` },
  description: 'Sellonit — supplier-to-retailer commerce platform.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="brand">{publicEnv.appName}</span>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
