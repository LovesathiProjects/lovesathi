'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  mode?: 'matrimony'
}

function Switch({
  className,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 shadow-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-[#C2A574]/30 disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[#C2A574] data-[state=unchecked]:bg-white data-[state=unchecked]:border-black/20',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-white pointer-events-none block size-5 rounded-full shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
