'use client'
import { motion } from 'framer-motion'
import EstimateBadge from './EstimateBadge'

export default function DecisionBanner({ summary, estimates }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative card p-4 border-2 border-accent"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-xl" />
      <div className="flex items-center justify-between pl-2">
        <div className="font-semibold">{summary}</div>
        <EstimateBadge {...(estimates || {})} />
      </div>
    </motion.div>
  )
}
