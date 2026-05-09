'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-12 max-w-full items-center justify-center rounded-2xl border border-[#C2A574]/30 bg-white/88 p-1 text-[#3A2B24] shadow-[0_12px_34px_rgba(24,17,13,0.06)]',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-4 py-2 text-sm font-bold whitespace-nowrap text-[#8B7B70] transition-all outline-none hover:text-[#C2A574] focus-visible:ring-[4px] focus-visible:ring-[#C2A574]/26 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-[#C2A574]/40 data-[state=active]:bg-white data-[state=active]:text-[#C2A574] data-[state=active]:shadow-[0_10px_24px_rgba(24,17,13,0.07)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
