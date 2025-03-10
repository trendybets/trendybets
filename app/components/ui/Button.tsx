import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/lib/utils';
import { colors, typography } from '@/app/styles/design-system';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-blue-500 text-white hover:bg-primary-blue-600 active:bg-primary-blue-700',
        destructive: 'bg-semantic-error text-white hover:bg-red-600 active:bg-red-700',
        outline: 'border border-primary-black-200 bg-transparent hover:bg-primary-black-50 text-primary-black-800',
        secondary: 'bg-primary-black-100 text-primary-black-800 hover:bg-primary-black-200 active:bg-primary-black-300',
        ghost: 'hover:bg-primary-black-50 text-primary-black-800 hover:text-primary-black-900',
        link: 'text-primary-blue-500 underline-offset-4 hover:underline',
        success: 'bg-semantic-success text-white hover:bg-primary-green-600 active:bg-primary-green-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-6',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants }; 