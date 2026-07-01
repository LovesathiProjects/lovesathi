import { MessageCircle, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WHATSAPP_CHAT_URL, WHATSAPP_NUMBER_DISPLAY } from "@/lib/support"
import { cn } from "@/lib/utils"

type WhatsAppCtaProps = {
  className?: string
  compact?: boolean
}

export function WhatsAppCta({ className, compact = false }: WhatsAppCtaProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-[#E83262]/18 bg-white p-4 shadow-[0_18px_50px_rgba(38,54,74,0.08)]",
        compact ? "sm:p-4" : "sm:p-5",
        className,
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-md border border-[#E6EAF1] bg-white p-2 shadow-inner sm:mx-0">
          <img src="/whatsapp-chat-qr.svg" alt="Scan QR to chat with LoveSathi on WhatsApp" className="h-full w-full" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E83262]/18 bg-[#FFF4F7] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#E83262]">
            <ScanLine className="h-3.5 w-3.5" />
            Scan QR to chat
          </div>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-[#26364A]">Chat with LoveSathi on WhatsApp</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#6F7C8B]">
            Scan the QR or message us directly at{" "}
            <a className="font-black text-[#E83262]" href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer">
              {WHATSAPP_NUMBER_DISPLAY}
            </a>
            .
          </p>
          <Button asChild className="mt-4 h-11 rounded-md px-5">
            <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
