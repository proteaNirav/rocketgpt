'use client'
import { motion } from 'framer-motion'

export default function TypingDots({ className = '' }: { className?: string }) {
  const dot = {
    animate: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } },
  }
  return (
    <div className={`inline-flex gap-1 ${className}`}>
      <motion.span className="w-1.5 h-1.5 rounded-full bg-muted" {...dot} />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-muted"
        {...dot}
        transition={{ delay: 0.15 }}
      />
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-muted"
        {...dot}
        transition={{ delay: 0.3 }}
      />
    </div>
  )
}
