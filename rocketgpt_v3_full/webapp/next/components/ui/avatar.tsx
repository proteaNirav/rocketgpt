'use client'

import * as React from 'react'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Avatar({ className = '', children, ...props }: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-muted text-sm font-medium ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function AvatarFallback({ className = '', children, ...props }: AvatarFallbackProps) {
  return (
    <span className={`uppercase ${className}`} {...props}>
      {children}
    </span>
  )
}
