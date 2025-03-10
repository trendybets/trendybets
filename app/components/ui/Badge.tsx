import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-blue-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-blue-500 text-white hover:bg-primary-blue-600',
        secondary: 'border-transparent bg-primary-black-100 text-primary-black-800 hover:bg-primary-black-200',
        outline: 'text-primary-black-800 border-primary-black-200',
        success: 'border-transparent bg-semantic-success text-white hover:bg-primary-green-600',
        warning: 'border-transparent bg-semantic-warning text-white hover:bg-amber-600',
        error: 'border-transparent bg-semantic-error text-white hover:bg-red-600',
        info: 'border-transparent bg-semantic-info text-white hover:bg-primary-blue-600',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, className }))} {...props} />
  );
}

export { Badge, badgeVariants }; 