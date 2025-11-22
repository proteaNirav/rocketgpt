// components/console/topbar.tsx
'use client'

import { ModeToggle } from '@/components/mode-toggle' // adjust if different
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function ConsoleTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4">
      <div className="text-sm font-medium text-muted-foreground">RocketGPT Console</div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        <Avatar className="h-8 w-8">
          <AvatarFallback>NS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
