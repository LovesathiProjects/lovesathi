import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-[#26364A] placeholder:text-[#6F7C8B]/65 selection:bg-[#E83262] selection:text-white flex h-12 w-full min-w-0 rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 py-3 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(24,17,13,0.04)] transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#F2F5FA]/60 disabled:opacity-60 md:text-sm',
        'focus-visible:border-[#E83262] focus-visible:bg-white focus-visible:ring-[4px] focus-visible:ring-[#E83262]/18',
        'aria-invalid:ring-[#E83262]/20 aria-invalid:border-[#E83262]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
