'use client'

import { Suspense, lazy, Dispatch, SetStateAction } from 'react'
import { PlayerData } from '../types'
import { TableSkeleton } from '@/components/ui/skeleton'

// Dynamically import the TrendsTable component
const TrendsTable = lazy(() => import('./trends-table').then(mod => ({ 
  default: mod.TrendsTable 
})))

interface DynamicTrendsTableProps {
  data: PlayerData[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  availableTeams?: string[]
  availableFixtures?: string[]
  filters?: {
    stat: string
    team: string
    fixture: string
  }
  setFilters?: Dispatch<SetStateAction<{
    stat: string
    team: string
    fixture: string
  }>>
}

/**
 * A wrapper component that dynamically loads the TrendsTable
 * This reduces the initial bundle size by loading the table only when needed
 */
export function DynamicTrendsTable(props: DynamicTrendsTableProps) {
  return (
    <Suspense fallback={
      <div className="p-4">
        <TableSkeleton rows={10} columns={7} />
      </div>
    }>
      <TrendsTable {...props} />
    </Suspense>
  )
} 