'use client'

import { Suspense, lazy, useState, useEffect } from 'react'
import { PlayerData } from '../types'
import { Skeleton } from '@/components/ui/skeleton'
import { colors } from '@/app/styles/design-system'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'

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
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  
  // Reset error state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setHasError(false)
      // Add a small delay before showing the dialog for a smoother transition
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      // Add a small delay before hiding the dialog for a smoother transition
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  
  // Handle errors in the lazy-loaded component
  const handleError = () => {
    setHasError(true)
  }
  
  // Only render the dialog if it's open
  if (!isOpen) return null
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-primary-black-900/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        // Close dialog when clicking on the backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className={`bg-white dark:bg-primary-black-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-primary-black-100 dark:border-primary-black-700 transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-8'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Error State */}
        {hasError && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-semantic-error mb-4" />
            <h3 className="text-xl font-bold text-primary-black-900 dark:text-primary-black-100 mb-2">
              Something went wrong
            </h3>
            <p className="text-primary-black-600 dark:text-primary-black-400 mb-6">
              We couldn't load the player analysis. Please try again later.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
        
        {/* No Player Data State */}
        {!hasError && !player && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-primary-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-primary-black-900 dark:text-primary-black-100 mb-2">
              No Player Data
            </h3>
            <p className="text-primary-black-600 dark:text-primary-black-400 mb-6">
              Player data is not available. Please select a different player.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
        
        {/* Loading State */}
        {!hasError && player && (
          <Suspense fallback={
            <div className="relative">
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-0 right-0 p-2 rounded-full hover:bg-primary-black-100 dark:hover:bg-primary-black-700 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-6 w-6 text-primary-black-500 dark:text-primary-black-400" />
              </button>
              
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
          }>
            <PlayerAnalysisDialog 
              player={player} 
              isOpen={isOpen} 
              onClose={onClose} 
            />
          </Suspense>
        )}
      </div>
    </div>
  )
} 