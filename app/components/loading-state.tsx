'use client'

import { motion } from "framer-motion"

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <motion.div
        className="text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Loading games...
      </motion.div>
    </div>
  )
} 