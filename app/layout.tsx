import type React from "react"
import type { Metadata } from "next"
import { Inter, Roboto_Mono, Dancing_Script } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { SocketProvider } from "@/contexts/SocketContext"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

const dancingScript = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Lovesathi - Matrimony",
  description: "A matrimony app for serious life-partner discovery.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${dancingScript.variable} antialiased bg-white`}>
      <body className="bg-white text-black">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SocketProvider>
            {children}
            <Toaster /> {/* ✅ Sonner toaster here */}
            <ShadcnToaster /> {/* ✅ Shadcn toaster for form validations */}
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
