'use client'

import { Suspense, lazy } from 'react'
import { PlayerData } from '../types'
import { Skeleton } from '@/components/ui/skeleton'
import { colors } from '@/app/styles/design-system'

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-black-900/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-primary-black-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-primary-black-100 dark:border-primary-black-700">
          <div className="animate-pulse space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-primary-black-200 dark:bg-primary-black-700 rounded"></div>
                <div className="h-4 w-48 bg-primary-black-100 dark:bg-primary-black-600 rounded"></div>
              </div>
              <div className="h-10 w-10 bg-primary-black-100 dark:bg-primary-black-700 rounded-full"></div>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-4 border-b border-primary-black-100 dark:border-primary-black-700">
              <div className="h-10 w-24 bg-primary-black-200 dark:bg-primary-black-700 rounded"></div>
              <div className="h-10 w-24 bg-primary-black-100 dark:bg-primary-black-600 rounded"></div>
              <div className="h-10 w-24 bg-primary-black-100 dark:bg-primary-black-600 rounded"></div>
            </div>
            
            {/* Content */}
            <div className="space-y-4">
              <div className="h-64 w-full bg-primary-black-100 dark:bg-primary-black-700 rounded"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-primary-black-100 dark:bg-primary-black-700 rounded"></div>
                <div className="h-32 bg-primary-black-100 dark:bg-primary-black-700 rounded"></div>
              </div>
              <div className="h-48 w-full bg-primary-black-100 dark:bg-primary-black-700 rounded"></div>
            </div>
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