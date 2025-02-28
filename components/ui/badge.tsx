import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-red-500/20 text-red-400",
        outline: "text-foreground border border-white/20",
        success: "border-transparent bg-green-500/20 text-green-400",
        hitrate90:
          "bg-green-500/20 text-green-400 border border-green-500/30 font-mono",
        hitrate80:
          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono",
        hitrate70:
          "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono",
        hitrate60:
          "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono",
        hitrate50:
          "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono",
        timeline:
          "bg-black text-white font-bold px-3 backdrop-blur-sm border-0"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 