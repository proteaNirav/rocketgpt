import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'RocketGPT • AI Orchestrator' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><meta charSet="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body className="min-h-screen bg-black text-white antialiased">{children}</body>
    </html>
  );
}
