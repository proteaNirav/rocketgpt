'use client'

import * as React from 'react'

type TabsContextValue = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string
}

export function Tabs({ defaultValue, children, ...props }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue)

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex rounded-md border bg-background p-1 gap-1">{children}</div>
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    return <button className="px-3 py-1 text-sm">{children}</button>
  }

  const isActive = ctx.value === value

  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={
        'px-3 py-1 text-sm rounded-md ' +
        (isActive ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground')
      }
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx || ctx.value !== value) return null
  return <div className="mt-4">{children}</div>
}
