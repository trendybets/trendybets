import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  fullWidthOnMobile?: boolean
  elevated?: boolean
  className?: string
}

/**
 * A responsive card component that adapts to different screen sizes
 * 
 * @param children - The content to display inside the card
 * @param padding - The padding to apply to the card
 * @param fullWidthOnMobile - Whether the card should take full width on mobile screens
 * @param elevated - Whether the card should have a shadow
 * @param className - Additional CSS classes to apply to the card
 */
export function ResponsiveCard({
  children,
  padding = 'md',
  fullWidthOnMobile = true,
  elevated = false,
  className,
  ...props
}: ResponsiveCardProps) {
  // Map padding to Tailwind classes
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200',
        fullWidthOnMobile ? 'w-full sm:w-auto' : '',
        elevated ? 'shadow-md' : '',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardHeader({
  children,
  className,
  ...props
}: ResponsiveCardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardTitle({
  children,
  className,
  ...props
}: ResponsiveCardTitleProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold text-gray-900 mb-1 sm:mb-0',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

interface ResponsiveCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardContent({
  children,
  className,
  ...props
}: ResponsiveCardContentProps) {
  return (
    <div
      className={cn(
        'w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardFooter({
  children,
  className,
  ...props
}: ResponsiveCardFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 