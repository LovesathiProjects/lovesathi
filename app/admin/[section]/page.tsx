import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdminPortal, type AdminSection } from "@/components/admin/admin-portal"

const ADMIN_SECTIONS = [
  "overview",
  "events",
  "members",
  "profiles",
  "safety",
  "premium",
  "plans",
  "notifications",
  "settings",
  "stories",
  "audit",
] as const

export const metadata: Metadata = {
  title: "Admin Module",
  description: "Focused Lovesathi admin module.",
  robots: {
    index: false,
    follow: false,
  },
}

export function generateStaticParams() {
  return ADMIN_SECTIONS.map((section) => ({ section }))
}

function isAdminSection(value: string): value is AdminSection {
  return (ADMIN_SECTIONS as readonly string[]).includes(value)
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params

  if (!isAdminSection(section)) {
    notFound()
  }

  return <AdminPortal section={section} />
}
