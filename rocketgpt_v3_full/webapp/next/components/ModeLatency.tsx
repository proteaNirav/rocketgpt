'use client'

import React from 'react'

export function ModeBadge({ mode }: { mode?: string }) {
  if (!mode) return null
  return (
    <span className="px-2 py-1 text-xs rounded-md bg-gray-800 text-white ml-2">
      /{mode}
    </span>
  )
}

export function Latency({ ms }: { ms?: number }) {
  if (ms == null) return null
  return (
    <span className="text-xs text-gray-500 ml-2">
      {Math.round(ms)} ms
    </span>
  )
}
