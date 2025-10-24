'use client'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)
  useEffect(()=>{ document.documentElement.classList.toggle('dark', dark) }, [dark])
  return (
    <button className="btn text-sm" onClick={()=>setDark(!dark)}>
      {dark ? '☀ Light' : '🌙 Dark'}
    </button>
  )
}
