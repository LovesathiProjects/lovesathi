import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-[#8B7B70]/65 focus-visible:border-[#C2A574] focus-visible:ring-[#C2A574]/18 aria-invalid:ring-[#C2A574]/20 aria-invalid:border-[#C2A574] flex field-sizing-content min-h-28 w-full rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 py-3 text-base font-medium text-[#3A2B24] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(24,17,13,0.04)] transition-all outline-none focus-visible:ring-[4px] disabled:cursor-not-allowed disabled:bg-[#EFE7DB]/60 disabled:opacity-60 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
