import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-[#3A2B24] placeholder:text-[#8B7B70]/65 selection:bg-[#C2A574] selection:text-[#3A2B24] flex h-12 w-full min-w-0 rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 py-3 text-base font-semibold text-[#3A2B24] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(24,17,13,0.04)] transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#EFE7DB]/60 disabled:opacity-60 md:text-sm',
        'focus-visible:border-[#C2A574] focus-visible:bg-white focus-visible:ring-[4px] focus-visible:ring-[#C2A574]/18',
        'aria-invalid:ring-[#C2A574]/20 aria-invalid:border-[#C2A574]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
