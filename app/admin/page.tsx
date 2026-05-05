import type { Metadata } from "next"
import { AdminPortal } from "@/components/admin/admin-portal"

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "Lovesathi operations and launch readiness portal.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminPage() {
  return <AdminPortal />
}
