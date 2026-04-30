/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-teal-400 text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-800',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'border-teal-400 text-teal-600',
        open: 'border-transparent bg-green-100 text-green-800',
        waitlist: 'border-transparent bg-amber-100 text-amber-800',
        closed: 'border-transparent bg-gray-100 text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
