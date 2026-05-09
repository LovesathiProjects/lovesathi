import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[4px] focus-visible:ring-[#C2A574]/28",
  {
    variants: {
      variant: {
        default:
          'bg-[#C2A574] text-[#3A2B24] border-2 border-[#C2A574] hover:bg-[#B9975E] hover:border-[#B9975E] shadow-[0_2px_8px_rgba(194,165,116,0.2)] hover:shadow-[0_4px_12px_rgba(194,165,116,0.3)] active:shadow-[0_1px_4px_rgba(194,165,116,0.2)]',
        destructive:
          'bg-[#C2A574] text-[#3A2B24] border-2 border-[#C2A574] hover:bg-[#B9975E] shadow-[0_2px_8px_rgba(194,165,116,0.2)] hover:shadow-[0_4px_12px_rgba(194,165,116,0.3)]',
        outline:
          'border border-[#482b1a]/18 bg-white/88 text-[#3A2B24] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:border-[#C2A574] hover:bg-white hover:text-[#C2A574]',
        secondary:
          'border border-[#C2A574]/28 bg-white/88 text-[#3A2B24] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:bg-white hover:text-[#C2A574]',
        ghost:
          'text-[#3A2B24] hover:bg-[#C2A574]/8 hover:text-[#C2A574]',
        link: 'text-[#C2A574] underline-offset-4 hover:underline hover:text-[#B9975E] font-semibold',
      },
      size: {
        default: 'h-11 px-5 sm:px-6 py-2 has-[>svg]:px-4 sm:has-[>svg]:px-5',
        sm: 'h-9 rounded-xl gap-1 sm:gap-1.5 px-3 sm:px-4 has-[>svg]:px-2 sm:has-[>svg]:px-3',
        lg: 'h-12 rounded-2xl px-6 sm:px-8 text-base has-[>svg]:px-5 sm:has-[>svg]:px-7',
        icon: 'size-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
