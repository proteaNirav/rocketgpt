import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RocketGPT • AI Orchestrator',
  description: 'Smart orchestration of AI, code, and automation',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0f0f0f" />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/50 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">RocketGPT <span className="opacity-70">AI Orchestrator</span></Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/status" className="hover:underline">System Status</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4">{children}</main>
      </body>
    </html>
  );
}
