import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'RocketGPT — Phase 2',
  description: 'Claude/Emergent-style chat UI for RocketGPT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>
        import './globals.css'
import Header from '@/components/Header'
import SentryClientInit from '@/components/SentryClientInit'   // <— add this

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SentryClientInit />     {/* <— mount once so client init always runs */}
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}

      </body>
    </html>
  )
}
