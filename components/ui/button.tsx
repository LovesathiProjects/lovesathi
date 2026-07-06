import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[4px] focus-visible:ring-[#E83262]/28",
  {
    variants: {
      variant: {
        default:
          'bg-[#E83262] text-white border-2 border-[#E83262] hover:-translate-y-0.5 hover:bg-[#C3264E] hover:border-[#C3264E] shadow-[0_14px_30px_rgba(232,50,98,0.22)] hover:shadow-[0_20px_44px_rgba(232,50,98,0.30)] active:shadow-[0_8px_18px_rgba(232,50,98,0.18)]',
        destructive:
          'bg-[#E83262] text-white border-2 border-[#E83262] hover:-translate-y-0.5 hover:bg-[#C3264E] shadow-[0_14px_30px_rgba(232,50,98,0.22)] hover:shadow-[0_20px_44px_rgba(232,50,98,0.30)]',
        outline:
          'border border-[#482b1a]/18 bg-white/88 text-[#26364A] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:-translate-y-0.5 hover:border-[#E83262] hover:bg-white hover:text-[#E83262]',
        secondary:
          'border border-[#E83262]/28 bg-white/88 text-[#26364A] shadow-[0_10px_24px_rgba(24,17,13,0.05)] hover:-translate-y-0.5 hover:bg-white hover:text-[#E83262]',
        ghost:
          'text-[#26364A] hover:bg-[#E83262]/8 hover:text-[#E83262]',
        link: 'text-[#E83262] underline-offset-4 hover:underline hover:text-[#C3264E] font-semibold',
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
