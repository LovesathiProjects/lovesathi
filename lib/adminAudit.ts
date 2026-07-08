import "server-only"

export type AdminAuditResource =
  | "verification"
  | "report"
  | "profile"
  | "user"
  | "entitlement"
  | "auth_email"
  | "event"
  | "event_registration"
  | "event_report"
  | "site_setting"
  | "notification"
  | "success_story"

export async function writeAdminAuditLog(
  supabase: any,
  {
    actorId,
    actorEmail,
    resource,
    recordId,
    previousStatus,
    nextStatus,
    notes,
    metadata,
  }: {
    actorId: string
    actorEmail: string | null
    resource: AdminAuditResource
    recordId: string | null
    previousStatus: string | null
    nextStatus: string
    notes: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action: `${resource}.${nextStatus}`,
    resource,
    record_id: recordId,
    previous_status: previousStatus,
    next_status: nextStatus,
    notes,
    metadata: metadata || {},
  })

  if (error) {
    console.warn("[admin/audit] Unable to write admin audit log:", error.message)
  }
}
