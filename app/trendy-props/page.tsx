'use client'

import { Suspense, lazy } from 'react'
import { CardSkeleton } from '@/components/ui/skeleton'

// Dynamically import the TrendyPropsView component
const TrendyPropsView = lazy(() => import('@/app/components/trendy-props-view').then(mod => ({ 
  default: mod.default 
})))

export default function TrendyPropsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4">
          <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded-md"></div>
          <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        
        <div className="mt-8 border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <div className="h-8 w-1/3 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
          <div className="p-4">
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton className="mb-4" />
            <CardSkeleton />
          </div>
        </div>
      </div>
    }>
      <TrendyPropsView />
    </Suspense>
  )
} 