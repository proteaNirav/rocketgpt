'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'rgpt-theme'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  const applyTheme = (nextTheme: Theme) => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

    const effectiveTheme: 'light' | 'dark' =
      nextTheme === 'system' ? (prefersDark ? 'dark' : 'light') : nextTheme

    // Remove both, then add the one we want
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)

    setThemeState(nextTheme)
    setResolvedTheme(effectiveTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  // Initial load: read from localStorage or fall back to system
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    const initialTheme: Theme = stored ?? 'system'
    applyTheme(initialTheme)
  }, [])

  // React to system theme changes when theme === "system"
  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      setThemeState((current) => {
        if (current !== 'system') return current
        applyTheme('system')
        return 'system'
      })
    }

    try {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    } catch {
      // Fallback for older browsers
      media.addListener(handleChange)
      return () => media.removeListener(handleChange)
    }
  }, [])

  const handleSetTheme = (nextTheme: Theme) => {
    applyTheme(nextTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: handleSetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
