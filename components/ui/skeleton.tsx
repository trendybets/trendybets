import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

/**
 * Skeleton component for loading states
 * @param className Optional CSS class names
 * @returns A skeleton loader component
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  )
}

/**
 * Card skeleton for loading states
 * @param className Optional CSS class names
 * @returns A skeleton card component
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-40 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

/**
 * Table skeleton for loading states
 * @param rows Number of rows to display
 * @param columns Number of columns to display
 * @param className Optional CSS class names
 * @returns A skeleton table component
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 5, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("w-full", className)}>
      {/* Table header */}
      <div className="flex w-full border-b pb-2">
        {Array(columns).fill(0).map((_, i) => (
          <div key={`header-${i}`} className="flex-1 px-2">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
      
      {/* Table rows */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex w-full py-4 border-b">
          {Array(columns).fill(0).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="flex-1 px-2">
              <Skeleton className={`h-4 w-${Math.floor(Math.random() * 40) + 60}%`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Stats card skeleton for loading states
 * @param className Optional CSS class names
 * @returns A skeleton stats card component
 */
export function StatsCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <div className="pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}

/**
 * Player card skeleton for loading states
 * @param className Optional CSS class names
 * @returns A skeleton player card component
 */
export function PlayerCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center space-x-4 rounded-lg border p-4", className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  )
} 