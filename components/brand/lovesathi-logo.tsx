import { cn } from "@/lib/utils"

type LovesathiLogoProps = {
  className?: string
  imageClassName?: string
}

export function LovesathiLogo({ className, imageClassName }: LovesathiLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/lovesathi-logo.jpeg"
        alt="LoveSathi - Connecting Souls for a Lifetime"
        className={cn("h-12 w-auto object-contain", imageClassName)}
      />
    </span>
  )
}
