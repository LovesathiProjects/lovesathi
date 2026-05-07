import type React from "react"
import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, DM_Mono, Manrope } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { SocketProvider } from "@/contexts/SocketContext"

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

const dmMono = DM_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lovesathi.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Lovesathi",
  title: {
    default: "Lovesathi - Premium Matrimony",
    template: "%s | Lovesathi",
  },
  description:
    "A premium matrimony experience for verified, intentional, family-aware life-partner discovery.",
  keywords: [
    "Lovesathi",
    "matrimony",
    "premium matrimony",
    "verified matrimony",
    "life partner",
    "Indian matrimony",
  ],
  authors: [{ name: "Lovesathi" }],
  creator: "Lovesathi",
  publisher: "Lovesathi",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Lovesathi",
    title: "Lovesathi - Premium Matrimony",
    description:
      "A refined matrimony app for serious life-partner discovery, trust, privacy, and family-ready conversations.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Lovesathi premium matrimony",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lovesathi - Premium Matrimony",
    description: "A refined matrimony app for serious life-partner discovery.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg" }],
  },
  manifest: "/manifest.json",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#8f001c",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable} ${dmMono.variable} antialiased bg-[#fdfdfb]`}>
      <body className="bg-[#fdfdfb] text-[#18110d]">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SocketProvider>
            {children}
            <Toaster />
            <ShadcnToaster />
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
