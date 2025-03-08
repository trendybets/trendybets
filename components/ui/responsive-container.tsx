import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  fullWidthOnMobile?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * A responsive container component that adapts to different screen sizes
 * 
 * @param children - The content to display inside the container
 * @param fullWidthOnMobile - Whether the container should take full width on mobile screens
 * @param maxWidth - The maximum width of the container
 * @param padding - The padding to apply to the container
 * @param className - Additional CSS classes to apply to the container
 */
export function ResponsiveContainer({
  children,
  fullWidthOnMobile = true,
  maxWidth = 'xl',
  padding = 'md',
  className,
  ...props
}: ResponsiveContainerProps) {
  // Map maxWidth to Tailwind classes
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }

  // Map padding to Tailwind classes
  const paddingClasses = {
    none: 'px-0',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 md:px-8',
    lg: 'px-6 sm:px-8 md:px-12',
  }

  return (
    <div
      className={cn(
        'mx-auto w-full',
        fullWidthOnMobile ? 'sm:w-auto' : '',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 