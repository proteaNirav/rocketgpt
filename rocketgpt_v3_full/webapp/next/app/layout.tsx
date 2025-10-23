import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RocketGPT — Phase 2',
  description: 'Claude/Emergent-style chat UI for RocketGPT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
