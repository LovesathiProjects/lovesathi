import { cn } from "@/lib/utils"

type LovesathiLogoProps = {
  className?: string
  imageClassName?: string
}

export function LovesathiLogo({ className, imageClassName }: LovesathiLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/lovesathi-logo.png"
        alt="LoveSathi"
        className={cn("h-12 w-auto object-contain", imageClassName)}
      />
    </span>
  )
}
