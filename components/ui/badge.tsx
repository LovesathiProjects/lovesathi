import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-[#E83262]/30 transition-all overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#E83262] text-white [a&]:hover:bg-[#C3264E]',
        secondary:
          'border-black bg-white text-black [a&]:hover:bg-black/5',
        destructive:
          'border-transparent bg-[#E83262] text-white [a&]:hover:bg-[#C3264E]',
        outline:
          'border-black/20 bg-white text-black [a&]:hover:bg-black/5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
