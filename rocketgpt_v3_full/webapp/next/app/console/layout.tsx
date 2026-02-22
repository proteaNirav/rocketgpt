// app/console/layout.tsx
import type { ReactNode } from 'react'
import { ConsoleAppShell } from '@/components/console/app-shell'

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <ConsoleAppShell>{children}</ConsoleAppShell>
}
