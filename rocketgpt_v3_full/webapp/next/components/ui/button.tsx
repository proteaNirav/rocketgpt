'use client'

import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'xs'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const variantClass =
      variant === 'outline'
        ? 'border border-border bg-transparent hover:bg-accent'
        : 'bg-primary text-primary-foreground hover:bg-primary/90'

    const sizeClass =
      size === 'sm'
        ? 'h-8 px-3 text-xs'
        : size === 'xs'
          ? 'h-7 px-2 text-[11px]'
          : 'h-9 px-4 text-sm'

    return (
      <button
        ref={ref}
        className={
          'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ' +
          variantClass +
          ' ' +
          sizeClass +
          ' ' +
          className
        }
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

export default Button
