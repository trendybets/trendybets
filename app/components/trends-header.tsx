"use client"  // Add this since we're using client-side features

import { motion } from "framer-motion"

const sloganVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
}

const pulseVariants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export function TrendsHeader() {
  return (
    <div className="bg-[#0B1120] pb-8">
      <div className="container mx-auto px-4 pt-8">
        <div className="space-y-6">
          {/* Title and Live Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Trends
            </h1>
            <div className="flex items-center gap-2 bg-green-500/10 rounded-full px-3 py-1.5">
              <motion.div
                variants={pulseVariants}
                animate="pulse"
                className="h-2 w-2 rounded-full bg-green-500"
              />
              <span className="text-xs font-semibold text-green-500">Live</span>
            </div>
          </div>

          {/* Animated Slogan */}
          <motion.p
            variants={sloganVariants}
            initial="hidden"
            animate="visible"
            className="text-lg font-medium text-gray-400"
          >
            Smart stats for your 10-leg parlay
          </motion.p>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search for a player..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              {/* Filter Buttons */}
              <button className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                Last 5 Games
              </button>
              <button className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                Points
              </button>
              <button className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                All Teams
              </button>
              <button className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-medium transition-colors">
                DraftKings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 