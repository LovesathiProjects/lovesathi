import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[4px] focus-visible:ring-[#d8c79f]/28",
  {
    variants: {
      variant: {
        default:
          'bg-[#97011A] text-white border-2 border-[#97011A] hover:bg-[#7A0115] hover:border-[#7A0115] shadow-[0_2px_8px_rgba(151,1,26,0.2)] hover:shadow-[0_4px_12px_rgba(151,1,26,0.3)] active:shadow-[0_1px_4px_rgba(151,1,26,0.2)]',
        destructive:
          'bg-[#97011A] text-white border-2 border-[#97011A] hover:bg-[#7A0115] shadow-[0_2px_8px_rgba(151,1,26,0.2)] hover:shadow-[0_4px_12px_rgba(151,1,26,0.3)]',
        outline:
          'border border-[#482b1a]/18 bg-white/88 text-[#18110d] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:border-[#b79b62] hover:bg-white hover:text-[#8f001c]',
        secondary:
          'border border-[#d8c79f]/28 bg-white/88 text-[#18110d] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:bg-white hover:text-[#8f001c]',
        ghost:
          'text-[#18110d] hover:bg-[#8f001c]/8 hover:text-[#8f001c]',
        link: 'text-[#97011A] underline-offset-4 hover:underline hover:text-[#7A0115] font-semibold',
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
