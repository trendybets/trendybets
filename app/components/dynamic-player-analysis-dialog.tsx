'use client'

import { Suspense, lazy } from 'react'
import { PlayerData } from '../types'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamically import the PlayerAnalysisDialog component
const PlayerAnalysisDialog = lazy(() => import('./player-analysis-dialog').then(mod => ({ 
  default: mod.PlayerAnalysisDialog 
})))

interface DynamicPlayerAnalysisDialogProps {
  player: PlayerData | null
  isOpen: boolean
  onClose: () => void
}

/**
 * A wrapper component that dynamically loads the PlayerAnalysisDialog
 * This reduces the initial bundle size by loading the dialog only when needed
 */
export function DynamicPlayerAnalysisDialog({ player, isOpen, onClose }: DynamicPlayerAnalysisDialogProps) {
  // Only render the dialog if it's open
  if (!isOpen) return null
  
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            <div className="h-64 w-full bg-gray-200 rounded"></div>
            <div className="h-32 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <PlayerAnalysisDialog 
        player={player} 
        isOpen={isOpen} 
        onClose={onClose} 
      />
    </Suspense>
  )
} 