'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string
  children: React.ReactNode
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-base text-gray-700 leading-relaxed",
          className
        )}
        {...props}
      >
        {children}
      </p>
    )
  }
)

Text.displayName = "Text"

export { Text } 