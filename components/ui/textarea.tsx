import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-[#6c5a4a]/65 focus-visible:border-[#b9904d] focus-visible:ring-[#d9b978]/18 aria-invalid:ring-[#97011A]/20 aria-invalid:border-[#97011A] flex field-sizing-content min-h-28 w-full rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 py-3 text-base font-medium text-[#18110d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(24,17,13,0.04)] transition-all outline-none focus-visible:ring-[4px] disabled:cursor-not-allowed disabled:bg-[#f6ead8]/60 disabled:opacity-60 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
