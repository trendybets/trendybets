import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * A responsive grid component that adapts to different screen sizes
 * 
 * @param children - The content to display inside the grid
 * @param columns - The number of columns at different breakpoints
 * @param gap - The gap between grid items
 * @param className - Additional CSS classes to apply to the grid
 */
export function ResponsiveGrid({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 },
  gap = 'md',
  className,
  ...props
}: ResponsiveGridProps) {
  // Map columns to Tailwind grid-cols classes
  const getColumnsClass = () => {
    const classes = []
    
    if (columns.xs) classes.push(`grid-cols-${columns.xs}`)
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`)
    
    return classes.join(' ')
  }

  // Map gap to Tailwind gap classes
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 md:gap-6',
    lg: 'gap-4 sm:gap-6 md:gap-8',
  }

  return (
    <div
      className={cn(
        'grid w-full',
        getColumnsClass(),
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 