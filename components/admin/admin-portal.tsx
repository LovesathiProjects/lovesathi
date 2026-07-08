"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  Database,
  FileWarning,
  HeartHandshake,
  ImageIcon,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  PenLine,
  PlusCircle,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Ticket,
  Upload,
  UserCheck,
  UserRoundCheck,
  Users,
  UserX,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans"

type AdminMetric = {
  label: string
  value: number
  status: "ok" | "warning"
  detail?: string
}

type AdminDashboardKpi = {
  label: string
  value: number
  status: "ok" | "warning"
  detail: string
}

type ReadinessItem = {
  label: string
  status: "ok" | "warning"
  detail: string
}

type AdminRiskItem = {
  label: string
  value: number
  severity: "clear" | "watch" | "urgent"
  detail: string
}

type QueueResult<T> = {
  status: "ok" | "warning"
  detail?: string
  items: T[]
}

type AdminProfileItem = {
  id: string
  userId: string
  publicId: string | null
  email: string | null
  phone: string | null
  name: string
  age: number | null
  gender: string | null
  createdBy: string | null
  city: string | null
  education: string | null
  jobTitle: string | null
  bio: string | null
  photos: string[]
  personal: Record<string, unknown>
  career: Record<string, unknown>
  family: Record<string, unknown>
  cultural: Record<string, unknown>
  partnerPreferences: Record<string, unknown>
  profileHidden: boolean
  photoCount: number
  completionSteps: number
  profileCompleted: boolean
  reviewStatus: string
  reviewNotes: string | null
  reviewedAt: string | null
  isSeededProfile: boolean
  flags: string[]
  createdAt: string | null
  updatedAt: string | null
}

type AdminUserItem = {
  id: string
  publicId: string | null
  email: string | null
  phone: string | null
  status: string
  provider: string | null
  emailConfirmedAt: string | null
  lastSignInAt: string | null
  suspendedUntil: string | null
  premium: {
    isPremium: boolean
    planId: string | null
    planName: string | null
    status: string | null
    activeUntil: string | null
    renewalDueAt: string | null
    graceUntil: string | null
    paymentDue: boolean
    source: string | null
  }
  profileName: string | null
  profileCompleted: boolean
  profileReviewStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminVerificationItem = {
  id: string
  userId: string
  profileName: string
  documentType: string | null
  status: string
  documentFileName: string | null
  faceScanFileName: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminReportItem = {
  id: string
  reporterId: string
  reportedUserId: string
  reporterName: string
  reportedName: string
  reason: string
  description: string | null
  status: string
  createdAt: string | null
  reviewedAt: string | null
}

type AdminEventStatus = "draft" | "published" | "archived"
type AdminEventType = "meetup" | "webinar" | "workshop" | "consultation" | "community"

type AdminEventItem = {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  eventType: AdminEventType
  city: string
  venue: string | null
  startsAt: string
  endsAt: string | null
  timezone: string
  rsvpUrl: string | null
  whatsappUrl: string | null
  bannerUrl: string | null
  capacity: number | null
  isFeatured: boolean
  status: AdminEventStatus
  publishedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminEventDraft = {
  id: string | null
  title: string
  slug: string
  summary: string
  description: string
  eventType: AdminEventType
  city: string
  venue: string
  startsAt: string
  endsAt: string
  rsvpUrl: string
  whatsappUrl: string
  bannerUrl: string
  capacity: string
  status: AdminEventStatus
  isFeatured: boolean
}

type AdminPlanItem = {
  id: string
  name: string
  durationLabel: string
  durationDays?: number
  priceLabel: string
  priceAmount?: number | null
  currency?: string
  isActive?: boolean
  updatedAt?: string | null
  features: string[]
}

type AdminPlanPriceDraft = {
  planId: string
  priceAmount: string
  priceLabel: string
  durationLabel: string
  isActive: boolean
}

type AdminSubscriptionItem = {
  id: string
  userId: string
  userEmail: string | null
  profileName: string | null
  planId: string | null
  planName: string | null
  status: string | null
  source: string | null
  activeUntil: string | null
  renewalDueAt: string | null
  graceUntil: string | null
  paymentDue: boolean
}

type AdminEventRegistrationItem = {
  id: string
  eventId: string
  eventTitle: string
  userId: string | null
  attendeeName: string
  attendeeEmail: string | null
  attendeePhone: string | null
  status: string
  notes: string | null
  createdAt: string | null
}

type AdminEventReportItem = {
  id: string
  eventId: string | null
  eventTitle: string
  reporterId: string | null
  reason: string
  description: string | null
  status: string
  createdAt: string | null
  reviewedAt: string | null
}

type AdminSiteSettingItem = {
  key: string
  category: string
  label: string
  value: string
  updatedAt: string | null
}

type AdminNotificationCampaignItem = {
  id: string
  channel: "push" | "email" | "sms"
  audience: string
  title: string
  body: string
  status: string
  sentAt: string | null
  createdAt: string | null
}

type AdminNotificationDraft = {
  channel: "push" | "email" | "sms"
  audience: string
  title: string
  body: string
}

type AdminSuccessStoryItem = {
  id: string
  coupleNames: string
  city: string | null
  story: string
  imageUrl: string | null
  weddingDate: string | null
  status: string
  displayOrder: number
  createdAt: string | null
  updatedAt: string | null
}

type AdminSuccessStoryDraft = {
  id: string | null
  coupleNames: string
  city: string
  story: string
  imageUrl: string
  weddingDate: string
  status: "draft" | "published" | "archived"
  displayOrder: string
}

type AdminDiscountBannerItem = {
  id: string
  title: string
  bannerText: string
  bannerImageUrl: string | null
  discountPercent: number
  planIds: string[]
  status: string
  startsAt: string | null
  endsAt: string | null
  updatedAt: string | null
}

type AdminDiscountBannerDraft = {
  id: string | null
  title: string
  bannerText: string
  bannerImageUrl: string
  discountPercent: string
  planIds: string[]
  status: "draft" | "published" | "archived"
  startsAt: string
  endsAt: string
}

type AdminUserDiscountItem = {
  id: string
  userId: string
  publicId: string | null
  userEmail: string | null
  profileName: string | null
  planId: string | null
  title: string
  discountPercent: number
  notes: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  updatedAt: string | null
}

type AdminUserDiscountDraft = {
  id: string | null
  publicId: string
  planId: string
  title: string
  discountPercent: string
  notes: string
  status: "active" | "expired" | "revoked"
  startsAt: string
  endsAt: string
}

type AdminProfileEditDraft = {
  id: string
  name: string
  age: string
  gender: string
  createdBy: string
  publicId: string
  phone: string
  bio: string
  photosJson: string
  personalJson: string
  careerJson: string
  familyJson: string
  culturalJson: string
  partnerPreferencesJson: string
  profileCompleted: boolean
  profileHidden: boolean
  reviewStatus: string
  notes: string
}

type AdminAuditItem = {
  id: string
  actorEmail: string | null
  action: string
  resource: string
  recordId: string | null
  previousStatus: string | null
  nextStatus: string | null
  notes: string | null
  createdAt: string | null
}

type AuthEmailCount = {
  action: string
  label: string
  description: string
  total: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailSummaryItem = {
  category: "email" | "magic_link"
  label: string
  description: string
  overall: number
  last30Days: number
  lastSeen: string | null
}

type AuthEmailEvent = {
  id: string
  action: string
  label: string
  email: string | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string | null
}

type AuthEmailTelemetry = {
  status: "ok" | "warning"
  detail?: string
  since: string | null
  last30Since: string | null
  until: string | null
  summary: AuthEmailSummaryItem[]
  counts: AuthEmailCount[]
  events: AuthEmailEvent[]
}

type AdminOverview = {
  admin: {
    email: string
  }
  host: string
  generatedAt: string
  dashboard: AdminDashboardKpi[]
  metrics: AdminMetric[]
  risk: AdminRiskItem[]
  queues: {
    users: QueueResult<AdminUserItem>
    profiles: QueueResult<AdminProfileItem>
    verifications: QueueResult<AdminVerificationItem>
    reports: QueueResult<AdminReportItem>
    events: QueueResult<AdminEventItem>
    audit: QueueResult<AdminAuditItem>
  }
  operations: {
    plans: AdminPlanItem[]
    activeSubscriptions: QueueResult<AdminSubscriptionItem>
    paymentHistory: QueueResult<AdminSubscriptionItem>
    eventRegistrations: QueueResult<AdminEventRegistrationItem>
    eventReports: QueueResult<AdminEventReportItem>
    siteSettings: QueueResult<AdminSiteSettingItem>
    notificationCampaigns: QueueResult<AdminNotificationCampaignItem>
    successStories: QueueResult<AdminSuccessStoryItem>
    discountBanners: QueueResult<AdminDiscountBannerItem>
    userDiscounts: QueueResult<AdminUserDiscountItem>
  }
  authEmailTelemetry: AuthEmailTelemetry
  readiness: ReadinessItem[]
}

type AdminQueueFilter = "all" | "attention" | "profiles" | "reports" | "events" | "premium" | "heritage"
export type AdminSection =
  | "overview"
  | "events"
  | "members"
  | "profiles"
  | "safety"
  | "premium"
  | "plans"
  | "notifications"
  | "settings"
  | "stories"
  | "audit"

type AdminActionResource =
  | "verification"
  | "report"
  | "event_registration"
  | "event_report"
  | "profile"
  | "user"
  | "entitlement"
  | "auth_email"

type PendingAdminAction = {
  resource: AdminActionResource
  id: string
  status: string
  title: string
  detail: string
  defaultNote: string
  destructive?: boolean
  options?: Record<string, unknown>
}

const metricIcons = [Users, BadgeCheck, Clock3, ShieldCheck, FileWarning, Crown, MessageCircle, Database, Sparkles]
const riskIcons = [FileWarning, UserRoundCheck, ShieldCheck, Mail, Crown, CalendarDays, Activity]
const eventTypes: AdminEventType[] = ["meetup", "webinar", "workshop", "consultation", "community"]
const eventStatuses: AdminEventStatus[] = ["draft", "published", "archived"]

function createEmptyEventDraft(): AdminEventDraft {
  return {
    id: null,
    title: "",
    slug: "",
    summary: "",
    description: "",
    eventType: "meetup",
    city: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    rsvpUrl: "",
    whatsappUrl: "",
    bannerUrl: "",
    capacity: "",
    status: "draft",
    isFeatured: false,
  }
}

function createEmptyNotificationDraft(): AdminNotificationDraft {
  return {
    channel: "push",
    audience: "all",
    title: "",
    body: "",
  }
}

function createEmptySuccessStoryDraft(): AdminSuccessStoryDraft {
  return {
    id: null,
    coupleNames: "",
    city: "",
    story: "",
    imageUrl: "",
    weddingDate: "",
    status: "draft",
    displayOrder: "0",
  }
}

function createEmptyDiscountBannerDraft(): AdminDiscountBannerDraft {
  return {
    id: null,
    title: "",
    bannerText: "",
    bannerImageUrl: "",
    discountPercent: "0",
    planIds: [],
    status: "draft",
    startsAt: "",
    endsAt: "",
  }
}

function createEmptyUserDiscountDraft(): AdminUserDiscountDraft {
  return {
    id: null,
    publicId: "",
    planId: "",
    title: "Private discount",
    discountPercent: "10",
    notes: "",
    status: "active",
    startsAt: "",
    endsAt: "",
  }
}

function safeJsonStringify(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function parseJsonField(value: string, label: string) {
  try {
    const parsed = JSON.parse(value || "{}")
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object.`)
    }
    return parsed
  } catch (error: any) {
    throw new Error(error?.message || `${label} is invalid JSON.`)
  }
}

function parsePhotosField(value: string) {
  try {
    const parsed = JSON.parse(value || "[]")
    if (!Array.isArray(parsed)) throw new Error("Photos must be a JSON array.")
    return parsed.map((item) => String(item || "").trim()).filter(Boolean)
  } catch (error: any) {
    throw new Error(error?.message || "Photos must be a JSON array.")
  }
}

function planToPriceDraft(plan: AdminPlanItem): AdminPlanPriceDraft {
  const numericPrice = plan.priceAmount ?? Number(String(plan.priceLabel || "").replace(/[^0-9]/g, ""))
  return {
    planId: plan.id,
    priceAmount: numericPrice ? String(numericPrice) : "",
    priceLabel: plan.priceLabel || "",
    durationLabel: plan.durationLabel || "",
    isActive: plan.isActive !== false,
  }
}

function discountBannerToDraft(item: AdminDiscountBannerItem): AdminDiscountBannerDraft {
  return {
    id: item.id,
    title: item.title,
    bannerText: item.bannerText,
    bannerImageUrl: item.bannerImageUrl || "",
    discountPercent: String(item.discountPercent || 0),
    planIds: item.planIds || [],
    status:
      item.status === "published" || item.status === "archived" || item.status === "draft"
        ? item.status
        : "draft",
    startsAt: toDateTimeLocal(item.startsAt),
    endsAt: toDateTimeLocal(item.endsAt),
  }
}

function userDiscountToDraft(item: AdminUserDiscountItem): AdminUserDiscountDraft {
  return {
    id: item.id,
    publicId: item.publicId || "",
    planId: item.planId || "",
    title: item.title,
    discountPercent: String(item.discountPercent || 10),
    notes: item.notes || "",
    status:
      item.status === "expired" || item.status === "revoked" || item.status === "active"
        ? item.status
        : "active",
    startsAt: toDateTimeLocal(item.startsAt),
    endsAt: toDateTimeLocal(item.endsAt),
  }
}

function profileToEditDraft(profile: AdminProfileItem): AdminProfileEditDraft {
  return {
    id: profile.id,
    name: profile.name || "",
    age: profile.age ? String(profile.age) : "",
    gender: profile.gender || "",
    createdBy: profile.createdBy || "",
    publicId: profile.publicId || "",
    phone: profile.phone || "",
    bio: profile.bio || "",
    photosJson: JSON.stringify(profile.photos || [], null, 2),
    personalJson: safeJsonStringify(profile.personal),
    careerJson: safeJsonStringify(profile.career),
    familyJson: safeJsonStringify(profile.family),
    culturalJson: safeJsonStringify(profile.cultural),
    partnerPreferencesJson: safeJsonStringify(profile.partnerPreferences),
    profileCompleted: profile.profileCompleted,
    profileHidden: profile.profileHidden,
    reviewStatus: profile.reviewStatus || "pending",
    notes: "Profile details updated by Lovesathi admin.",
  }
}

function matchesSearch(parts: Array<string | number | null | undefined>, query: string) {
  if (!query) return true
  return parts.some((part) => String(part || "").toLowerCase().includes(query))
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusLabel(value: string) {
  return value
    .split(/[_\.]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function resourceLabel(value: string) {
  return statusLabel(value)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function eventToDraft(event: AdminEventItem): AdminEventDraft {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    description: event.description,
    eventType: event.eventType,
    city: event.city,
    venue: event.venue || "",
    startsAt: toDateTimeLocal(event.startsAt),
    endsAt: toDateTimeLocal(event.endsAt),
    rsvpUrl: event.rsvpUrl || "",
    whatsappUrl: event.whatsappUrl || "",
    bannerUrl: event.bannerUrl || "",
    capacity: event.capacity ? String(event.capacity) : "",
    status: event.status,
    isFeatured: event.isFeatured,
  }
}

function successStoryToDraft(story: AdminSuccessStoryItem): AdminSuccessStoryDraft {
  return {
    id: story.id,
    coupleNames: story.coupleNames,
    city: story.city || "",
    story: story.story,
    imageUrl: story.imageUrl || "",
    weddingDate: story.weddingDate || "",
    status:
      story.status === "published" || story.status === "archived" || story.status === "draft"
        ? story.status
        : "draft",
    displayOrder: String(story.displayOrder || 0),
  }
}

function StatusBadge({ status }: { status: string }) {
  const safeStatus = status.toLowerCase()
  const isGood = ["ok", "approved", "resolved", "active", "premium"].includes(safeStatus)
  const isWarning = ["pending", "in_review", "reviewed", "warning", "unconfirmed", "free", "past_due"].includes(safeStatus)

  return (
    <Badge
      variant="outline"
      className={
        isGood
          ? "border-[#1b6b43]/20 bg-[#1b6b43]/10 text-[#1b6b43]"
          : isWarning
            ? "border-[#E83262]/25 bg-[#E83262]/12 text-[#8a641f]"
            : "border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
      }
    >
      {statusLabel(status)}
    </Badge>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-[#482b1a]/18 bg-white/45 p-5 text-sm font-semibold text-[#6F7C8B]">
      {copy}
    </div>
  )
}

function normaliseStatus(value?: string | null) {
  return (value || "").toLowerCase()
}

function userNeedsAttention(item: AdminUserItem) {
  const userStatus = normaliseStatus(item.status)
  const reviewStatus = normaliseStatus(item.profileReviewStatus)
  const premiumStatus = normaliseStatus(item.premium.status)

  return (
    userStatus !== "active" ||
    !item.emailConfirmedAt ||
    item.premium.paymentDue ||
    premiumStatus === "past_due" ||
    ["pending", "in_review", "rejected"].includes(reviewStatus)
  )
}

function profileNeedsAttention(profile: AdminProfileItem) {
  return (
    !profile.profileCompleted ||
    profile.flags.length > 0 ||
    ["pending", "in_review", "rejected"].includes(normaliseStatus(profile.reviewStatus))
  )
}

function verificationNeedsAttention(item: AdminVerificationItem) {
  return ["pending", "in_review", "rejected"].includes(normaliseStatus(item.status))
}

function reportNeedsAttention(item: AdminReportItem) {
  return ["pending", "reviewed"].includes(normaliseStatus(item.status))
}

function eventNeedsAttention(item: AdminEventItem) {
  return item.status === "draft" || (!item.rsvpUrl && !item.whatsappUrl)
}

function userMatchesLane(item: AdminUserItem, lane: AdminQueueFilter) {
  if (lane === "attention") return userNeedsAttention(item)
  if (lane === "premium") return Boolean(item.premium.isPremium || item.premium.status)
  if (lane === "heritage") return item.premium.planId === "heritage"
  return true
}

function profileMatchesLane(profile: AdminProfileItem, lane: AdminQueueFilter) {
  if (lane === "all") return true
  if (lane === "attention" || lane === "profiles") return profileNeedsAttention(profile)
  return false
}

function verificationMatchesLane(item: AdminVerificationItem, lane: AdminQueueFilter) {
  if (lane === "all") return true
  if (lane === "attention") return verificationNeedsAttention(item)
  if (lane === "profiles") return verificationNeedsAttention(item)
  return false
}

function reportMatchesLane(item: AdminReportItem, lane: AdminQueueFilter) {
  if (lane === "all") return true
  if (lane === "attention" || lane === "reports") return reportNeedsAttention(item)
  return false
}

function eventMatchesLane(item: AdminEventItem, lane: AdminQueueFilter) {
  if (lane === "all" || lane === "events") return true
  if (lane === "attention") return eventNeedsAttention(item)
  return false
}

function auditMatchesLane(item: AdminAuditItem, lane: AdminQueueFilter) {
  const resource = normaliseStatus(item.resource)
  if (lane === "all") return true
  if (lane === "attention") return false
  if (lane === "profiles") return resource === "profile"
  if (lane === "reports") return resource === "report"
  if (lane === "events") return resource === "event"
  if (lane === "premium" || lane === "heritage") return resource === "entitlement"
  return false
}

export function AdminPortal({ section = "overview" }: { section?: AdminSection }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [adminSearch, setAdminSearch] = useState("")
  const [queueFilter, setQueueFilter] = useState<AdminQueueFilter>("all")
  const [eventDraft, setEventDraft] = useState<AdminEventDraft>(() => createEmptyEventDraft())
  const [eventSaving, setEventSaving] = useState(false)
  const [eventBannerUploading, setEventBannerUploading] = useState(false)
  const [pendingEventDelete, setPendingEventDelete] = useState<AdminEventItem | null>(null)
  const [notificationDraft, setNotificationDraft] = useState<AdminNotificationDraft>(() => createEmptyNotificationDraft())
  const [notificationSaving, setNotificationSaving] = useState(false)
  const [siteSettingDrafts, setSiteSettingDrafts] = useState<AdminSiteSettingItem[]>([])
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [successStoryDraft, setSuccessStoryDraft] = useState<AdminSuccessStoryDraft>(() => createEmptySuccessStoryDraft())
  const [successStorySaving, setSuccessStorySaving] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<AdminProfileItem | null>(null)
  const [profileEditDraft, setProfileEditDraft] = useState<AdminProfileEditDraft | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [planPriceDrafts, setPlanPriceDrafts] = useState<AdminPlanPriceDraft[]>([])
  const [pricingSaving, setPricingSaving] = useState(false)
  const [discountBannerDraft, setDiscountBannerDraft] = useState<AdminDiscountBannerDraft>(() => createEmptyDiscountBannerDraft())
  const [discountBannerSaving, setDiscountBannerSaving] = useState(false)
  const [discountBannerUploading, setDiscountBannerUploading] = useState(false)
  const [userDiscountDraft, setUserDiscountDraft] = useState<AdminUserDiscountDraft>(() => createEmptyUserDiscountDraft())
  const [userDiscountSaving, setUserDiscountSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAdminAction | null>(null)
  const [pendingActionNote, setPendingActionNote] = useState("")

  const generatedAt = overview?.generatedAt ? formatDate(overview.generatedAt) : null
  const refreshing = loading && Boolean(sessionToken)
  const searchTerm = adminSearch.trim().toLowerCase()
  const dashboardKpis = overview?.dashboard || []
  const authEmailOverall =
    overview?.authEmailTelemetry.summary.find((item) => item.category === "email")?.overall ||
    overview?.authEmailTelemetry.counts.reduce((total, item) => total + item.total, 0) ||
    0
  const authEmailLast30 =
    overview?.authEmailTelemetry.summary.find((item) => item.category === "email")?.last30Days || 0
  const userItems = overview?.queues.users.items || []
  const profileItems = overview?.queues.profiles.items || []
  const profileReviewActionsReady = overview?.queues.profiles.status === "ok"
  const verificationItems = overview?.queues.verifications.items || []
  const reportItems = overview?.queues.reports.items || []
  const eventItems = overview?.queues.events.items || []
  const auditItems = overview?.queues.audit.items || []
  const planItems = overview?.operations.plans || []
  const activeSubscriptionItems = overview?.operations.activeSubscriptions.items || []
  const paymentHistoryItems = overview?.operations.paymentHistory.items || []
  const eventRegistrationItems = overview?.operations.eventRegistrations.items || []
  const eventReportItems = overview?.operations.eventReports.items || []
  const siteSettingItems = overview?.operations.siteSettings.items || []
  const notificationCampaignItems = overview?.operations.notificationCampaigns.items || []
  const successStoryItems = overview?.operations.successStories.items || []
  const discountBannerItems = overview?.operations.discountBanners.items || []
  const userDiscountItems = overview?.operations.userDiscounts.items || []
  const searchedUsers = userItems.filter((item) =>
    matchesSearch(
      [
        item.email,
        item.phone,
        item.id,
        item.publicId,
        item.status,
        item.provider,
        item.profileName,
        item.profileReviewStatus,
        item.premium.planName,
        item.premium.status,
      ],
      searchTerm,
    ),
  )
  const searchedProfiles = profileItems.filter((profile) =>
    matchesSearch(
      [
        profile.name,
        profile.email,
        profile.phone,
        profile.publicId,
        profile.gender,
        profile.city,
        profile.education,
        profile.jobTitle,
        profile.createdBy,
        profile.reviewStatus,
        profile.flags.join(" "),
      ],
      searchTerm,
    ),
  )
  const searchedVerifications = verificationItems.filter((item) =>
    matchesSearch([item.profileName, item.userId, item.documentType, item.status, item.documentFileName, item.notes], searchTerm),
  )
  const searchedReports = reportItems.filter((item) =>
    matchesSearch(
      [item.reporterName, item.reportedName, item.reporterId, item.reportedUserId, item.reason, item.description, item.status],
      searchTerm,
    ),
  )
  const searchedEvents = eventItems.filter((item) =>
    matchesSearch(
      [item.title, item.slug, item.summary, item.description, item.eventType, item.city, item.venue, item.status],
      searchTerm,
    ),
  )
  const searchedEventRegistrations = eventRegistrationItems.filter((item) =>
    matchesSearch(
      [
        item.eventTitle,
        item.attendeeName,
        item.attendeeEmail,
        item.attendeePhone,
        item.status,
        item.notes,
      ],
      searchTerm,
    ),
  )
  const searchedEventReports = eventReportItems.filter((item) =>
    matchesSearch([item.eventTitle, item.reason, item.description, item.status, item.reporterId], searchTerm),
  )
  const searchedNotifications = notificationCampaignItems.filter((item) =>
    matchesSearch([item.channel, item.audience, item.title, item.body, item.status], searchTerm),
  )
  const searchedSuccessStories = successStoryItems.filter((item) =>
    matchesSearch([item.coupleNames, item.city, item.story, item.status], searchTerm),
  )
  const searchedDiscountBanners = discountBannerItems.filter((item) =>
    matchesSearch([item.title, item.bannerText, item.discountPercent, item.planIds.join(" "), item.status], searchTerm),
  )
  const searchedUserDiscounts = userDiscountItems.filter((item) =>
    matchesSearch([item.publicId, item.userEmail, item.profileName, item.planId, item.title, item.discountPercent, item.status, item.notes], searchTerm),
  )
  const searchedAudit = auditItems.filter((item) =>
    matchesSearch(
      [item.actorEmail, item.action, item.resource, item.recordId, item.previousStatus, item.nextStatus, item.notes],
      searchTerm,
    ),
  )
  const filteredUsers = searchedUsers.filter((item) => userMatchesLane(item, queueFilter))
  const filteredProfiles = searchedProfiles.filter((profile) => profileMatchesLane(profile, queueFilter))
  const filteredVerifications = searchedVerifications.filter((item) => verificationMatchesLane(item, queueFilter))
  const filteredReports = searchedReports.filter((item) => reportMatchesLane(item, queueFilter))
  const filteredEvents = searchedEvents.filter((item) => eventMatchesLane(item, queueFilter))
  const filteredAudit = searchedAudit.filter((item) => auditMatchesLane(item, queueFilter))
  const attentionUsers = userItems.filter(userNeedsAttention)
  const attentionProfiles = profileItems.filter(profileNeedsAttention)
  const attentionVerifications = verificationItems.filter(verificationNeedsAttention)
  const attentionReports = reportItems.filter(reportNeedsAttention)
  const attentionEvents = eventItems.filter(eventNeedsAttention)
  const premiumUsers = userItems.filter((item) => item.premium.isPremium || item.premium.status)
  const heritageUsers = searchedUsers.filter((item) => item.premium.planId === "heritage")
  const paymentDueUsers = userItems.filter((item) => item.premium.paymentDue)
  const totalQueueItems = userItems.length + profileItems.length + verificationItems.length + reportItems.length + eventItems.length
  const publishedEventCount = eventItems.filter((item) => item.status === "published").length
  const queueFilters: Array<{
    id: AdminQueueFilter
    label: string
    count: number
    detail: string
  }> = [
    {
      id: "all",
      label: "All queues",
      count: totalQueueItems,
      detail: "Full admin command view",
    },
    {
      id: "attention",
      label: "Needs attention",
      count: attentionUsers.length + attentionProfiles.length + attentionVerifications.length + attentionReports.length + attentionEvents.length,
      detail: "Review, safety, email, events, and renewal risks",
    },
    {
      id: "profiles",
      label: "Profile review",
      count: attentionProfiles.length,
      detail: "Incomplete, flagged, or pending dossiers",
    },
    {
      id: "reports",
      label: "Safety desk",
      count: attentionReports.length,
      detail: "Open member reports",
    },
    {
      id: "events",
      label: "Events",
      count: eventItems.length,
      detail: "Public calendar drafts and live listings",
    },
    {
      id: "premium",
      label: "Premium ops",
      count: premiumUsers.length,
      detail: "Manual entitlements and payment follow-up",
    },
    {
      id: "heritage",
      label: "Heritage concierge",
      count: userItems.filter((item) => item.premium.planId === "heritage").length,
      detail: "High-touch members needing concierge care",
    },
  ]
  const selectedQueueFilter = queueFilters.find((filter) => filter.id === queueFilter) || queueFilters[0]
  const urgentWorkCount =
    attentionUsers.length + attentionProfiles.length + attentionVerifications.length + attentionReports.length + attentionEvents.length
  const currentSection: AdminSection = section
  const adminNavItems: Array<{ id: AdminSection; href: string; label: string; icon: typeof Activity; count: number }> = [
    { id: "overview", href: "/admin", label: "Overview", icon: Activity, count: urgentWorkCount },
    { id: "events", href: "/admin/events", label: "Events", icon: CalendarDays, count: eventItems.length },
    { id: "members", href: "/admin/members", label: "Members", icon: Users, count: filteredUsers.length },
    { id: "profiles", href: "/admin/profiles", label: "Profiles", icon: UserRoundCheck, count: filteredProfiles.length + filteredVerifications.length },
    { id: "safety", href: "/admin/safety", label: "Safety", icon: ShieldCheck, count: filteredReports.length },
    { id: "premium", href: "/admin/premium", label: "Premium", icon: Crown, count: activeSubscriptionItems.length },
    { id: "plans", href: "/admin/plans", label: "Plans", icon: CreditCard, count: planItems.length },
    { id: "notifications", href: "/admin/notifications", label: "Notify", icon: Bell, count: notificationCampaignItems.length },
    { id: "settings", href: "/admin/settings", label: "Settings", icon: Settings, count: siteSettingItems.length },
    { id: "stories", href: "/admin/stories", label: "Stories", icon: HeartHandshake, count: successStoryItems.length },
    { id: "audit", href: "/admin/audit", label: "Audit", icon: Database, count: filteredAudit.length },
  ]
  const currentNavItem = adminNavItems.find((item) => item.id === currentSection) || adminNavItems[0]

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return
      setSessionToken(session?.access_token || null)
      setLoading(false)
    }

    void hydrate()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token || null)
      if (!session) {
        setOverview(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessionToken) return

    let mounted = true

    async function loadOverview() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/overview", {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load admin overview")
        }
        if (mounted) {
          setOverview(payload)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Unable to load admin overview")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      mounted = false
    }
  }, [sessionToken, refreshIndex])

  useEffect(() => {
    if (!overview?.operations.siteSettings.items) return
    setSiteSettingDrafts(overview.operations.siteSettings.items)
  }, [overview?.generatedAt, overview?.operations.siteSettings.items])

  useEffect(() => {
    if (!overview?.operations.plans) return
    setPlanPriceDrafts(overview.operations.plans.map(planToPriceDraft))
  }, [overview?.generatedAt, overview?.operations.plans])

  useEffect(() => {
    if (!selectedProfile) return
    const refreshed = profileItems.find((profile) => profile.id === selectedProfile.id)
    if (refreshed) {
      setSelectedProfile(refreshed)
      setProfileEditDraft(profileToEditDraft(refreshed))
    }
  }, [overview?.generatedAt])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setError(null)
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (loginError) throw loginError
      setSessionToken(data.session?.access_token || null)
    } catch (err: any) {
      setError(err.message || "Unable to sign in")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSessionToken(null)
    setOverview(null)
  }

  function buildAdminAction(resource: AdminActionResource, id: string, status: string, options?: Record<string, unknown>): PendingAdminAction {
    const defaultNote =
      resource === "verification" && status === "rejected"
        ? "Rejected by Lovesathi admin review."
        : resource === "verification" && status === "approved"
          ? "Approved by Lovesathi admin review."
          : resource === "verification"
            ? "Moved to in-review by Lovesathi admin."
            : resource === "profile" && status === "approved"
              ? "Profile approved by Lovesathi admin review."
              : resource === "profile" && status === "rejected"
                ? "Profile rejected by Lovesathi admin review."
                : resource === "profile"
                  ? `Profile marked ${statusLabel(status)} by Lovesathi admin.`
                    : resource === "user" && status === "suspended"
                      ? "User access suspended by Lovesathi admin review."
                      : resource === "user" && status === "deleted"
                        ? "User account permanently deleted by Lovesathi admin review."
                      : resource === "user"
                        ? "User access restored by Lovesathi admin review."
                        : resource === "entitlement" && status === "active"
                          ? "Premium access granted by Lovesathi admin."
                          : resource === "entitlement" && status === "past_due"
                            ? "Premium renewal marked due by Lovesathi admin."
                          : resource === "entitlement"
                            ? "Premium access revoked by Lovesathi admin."
                            : resource === "auth_email"
                              ? "Confirmation code resent by Lovesathi admin."
                              : resource === "event_registration"
                                ? `Event registration marked ${statusLabel(status)} by Lovesathi admin.`
                                : resource === "event_report"
                                  ? `Event report marked ${statusLabel(status)} by Lovesathi admin.`
                              : `Report marked ${statusLabel(status)} by Lovesathi admin.`
    const title =
      resource === "auth_email" && status === "resend_confirmation"
        ? "Resend verification email"
        : resource === "user" && status === "deleted"
          ? "Delete user permanently"
          : `Confirm ${resourceLabel(resource)} update`
    const detail =
      resource === "auth_email" && status === "resend_confirmation"
        ? "A fresh Supabase confirmation email will be sent to this member."
        : resource === "user" && status === "deleted"
          ? "This permanently removes the Supabase Auth user and attempts to remove their uploaded profile assets."
          : resource === "entitlement" && status === "active"
            ? `Grant ${statusLabel(String(options?.planId || "premium"))} premium access and write the action to the audit trail.`
            : `Mark this ${resourceLabel(resource)} as ${statusLabel(status)} and write the action to the audit trail.`

    return {
      resource,
      id,
      status,
      options,
      title,
      detail,
      defaultNote,
      destructive:
        (resource === "user" && (status === "deleted" || status === "suspended")) ||
        status === "rejected" ||
        status === "canceled" ||
        status === "dismissed",
    }
  }

  function handleAction(resource: AdminActionResource, id: string, status: string, options?: Record<string, unknown>) {
    if (!sessionToken) return
    const action = buildAdminAction(resource, id, status, options)
    setPendingAction(action)
    setPendingActionNote(action.defaultNote)
  }

  async function submitPendingAction() {
    if (!sessionToken || !pendingAction) return
    const key = `${pendingAction.resource}:${pendingAction.id}:${pendingAction.status}`
    setActionKey(key)
    setError(null)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resource: pendingAction.resource,
          id: pendingAction.id,
          status: pendingAction.status,
          notes: pendingActionNote.trim() || pendingAction.defaultNote,
          ...pendingAction.options,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update admin record")
      }
      setPendingAction(null)
      setPendingActionNote("")
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to update admin record")
    } finally {
      setActionKey(null)
    }
  }

  function updateEventDraft<K extends keyof AdminEventDraft>(key: K, value: AdminEventDraft[K]) {
    setEventDraft((previous) => ({ ...previous, [key]: value }))
  }

  function updateNotificationDraft<K extends keyof AdminNotificationDraft>(key: K, value: AdminNotificationDraft[K]) {
    setNotificationDraft((previous) => ({ ...previous, [key]: value }))
  }

  function updateSiteSettingDraft(key: string, value: string) {
    setSiteSettingDrafts((items) => items.map((item) => (item.key === key ? { ...item, value } : item)))
  }

  function updateSuccessStoryDraft<K extends keyof AdminSuccessStoryDraft>(key: K, value: AdminSuccessStoryDraft[K]) {
    setSuccessStoryDraft((previous) => ({ ...previous, [key]: value }))
  }

  async function uploadEventBanner(event: ChangeEvent<HTMLInputElement>) {
    if (!sessionToken) return
    const file = event.target.files?.[0]
    if (!file) return

    setEventBannerUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("banner", file)
      if (eventDraft.id) {
        formData.append("eventId", eventDraft.id)
      }

      const response = await fetch("/api/admin/event-banner", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to upload event banner")
      }
      updateEventDraft("bannerUrl", payload.bannerUrl || "")
    } catch (err: any) {
      setError(err.message || "Unable to upload event banner")
    } finally {
      setEventBannerUploading(false)
      event.target.value = ""
    }
  }

  async function saveEventDraft(draft: AdminEventDraft, statusOverride?: AdminEventStatus) {
    if (!sessionToken) return
    setEventSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          status: statusOverride || draft.status,
          startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : "",
          endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : "",
          capacity: draft.capacity ? Number(draft.capacity) : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save event")
      }
      setEventDraft(createEmptyEventDraft())
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save event")
    } finally {
      setEventSaving(false)
    }
  }

  async function saveEvent(statusOverride?: AdminEventStatus) {
    await saveEventDraft(eventDraft, statusOverride)
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveEvent()
  }

  function handleEditEvent(item: AdminEventItem) {
    setEventDraft(eventToDraft(item))
  }

  async function confirmDeleteEvent() {
    if (!sessionToken || !pendingEventDelete) return

    setEventSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events?id=${encodeURIComponent(pendingEventDelete.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete event")
      }
      if (eventDraft.id === pendingEventDelete.id) {
        setEventDraft(createEmptyEventDraft())
      }
      setPendingEventDelete(null)
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to delete event")
    } finally {
      setEventSaving(false)
    }
  }

  async function saveNotification(status: "draft" | "sent" = "draft") {
    if (!sessionToken) return
    setNotificationSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...notificationDraft,
          status,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save notification")
      }
      setNotificationDraft(createEmptyNotificationDraft())
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save notification")
    } finally {
      setNotificationSaving(false)
    }
  }

  async function saveSiteSettings() {
    if (!sessionToken) return
    setSettingsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: siteSettingDrafts }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save settings")
      }
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save settings")
    } finally {
      setSettingsSaving(false)
    }
  }

  async function saveSuccessStoryDraft(draft: AdminSuccessStoryDraft, statusOverride?: AdminSuccessStoryDraft["status"]) {
    if (!sessionToken) return
    setSuccessStorySaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/success-stories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          status: statusOverride || draft.status,
          displayOrder: Number(draft.displayOrder) || 0,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save success story")
      }
      setSuccessStoryDraft(createEmptySuccessStoryDraft())
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save success story")
    } finally {
      setSuccessStorySaving(false)
    }
  }

  async function saveSuccessStory(statusOverride?: AdminSuccessStoryDraft["status"]) {
    await saveSuccessStoryDraft(successStoryDraft, statusOverride)
  }

  function handleEditSuccessStory(item: AdminSuccessStoryItem) {
    setSuccessStoryDraft(successStoryToDraft(item))
  }

  function handleOpenProfile(profile: AdminProfileItem) {
    setSelectedProfile(profile)
    setProfileEditDraft(profileToEditDraft(profile))
  }

  function updateProfileEditDraft<K extends keyof AdminProfileEditDraft>(key: K, value: AdminProfileEditDraft[K]) {
    setProfileEditDraft((previous) => (previous ? { ...previous, [key]: value } : previous))
  }

  async function saveProfileEditDraft() {
    if (!sessionToken || !profileEditDraft) return
    setProfileSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: profileEditDraft.id,
          name: profileEditDraft.name,
          age: profileEditDraft.age ? Number(profileEditDraft.age) : null,
          gender: profileEditDraft.gender,
          createdBy: profileEditDraft.createdBy,
          publicId: profileEditDraft.publicId,
          phone: profileEditDraft.phone,
          bio: profileEditDraft.bio,
          photos: parsePhotosField(profileEditDraft.photosJson),
          personal: parseJsonField(profileEditDraft.personalJson, "Personal details"),
          career: parseJsonField(profileEditDraft.careerJson, "Career details"),
          family: parseJsonField(profileEditDraft.familyJson, "Family details"),
          cultural: parseJsonField(profileEditDraft.culturalJson, "Cultural details"),
          partnerPreferences: parseJsonField(profileEditDraft.partnerPreferencesJson, "Partner preferences"),
          profileCompleted: profileEditDraft.profileCompleted,
          profileHidden: profileEditDraft.profileHidden,
          reviewStatus: profileEditDraft.reviewStatus,
          notes: profileEditDraft.notes,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile details")
      }
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save profile details")
    } finally {
      setProfileSaving(false)
    }
  }

  function updatePlanPriceDraft(planId: string, key: keyof AdminPlanPriceDraft, value: string | boolean) {
    setPlanPriceDrafts((drafts) =>
      drafts.map((draft) => (draft.planId === planId ? { ...draft, [key]: value } : draft)),
    )
  }

  async function savePlanPriceDraft(draft: AdminPlanPriceDraft) {
    if (!sessionToken) return
    setPricingSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "plan_pricing",
          planId: draft.planId,
          priceAmount: Number(draft.priceAmount),
          priceLabel: draft.priceLabel,
          durationLabel: draft.durationLabel,
          isActive: draft.isActive,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save plan price")
      }
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save plan price")
    } finally {
      setPricingSaving(false)
    }
  }

  function updateDiscountBannerDraft<K extends keyof AdminDiscountBannerDraft>(key: K, value: AdminDiscountBannerDraft[K]) {
    setDiscountBannerDraft((previous) => ({ ...previous, [key]: value }))
  }

  function toggleDiscountBannerPlan(planId: string) {
    setDiscountBannerDraft((previous) => ({
      ...previous,
      planIds: previous.planIds.includes(planId)
        ? previous.planIds.filter((item) => item !== planId)
        : [...previous.planIds, planId],
    }))
  }

  async function uploadDiscountBanner(event: ChangeEvent<HTMLInputElement>) {
    if (!sessionToken) return
    const file = event.target.files?.[0]
    if (!file) return

    setDiscountBannerUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("banner", file)
      if (discountBannerDraft.id) {
        formData.append("bannerId", discountBannerDraft.id)
      }

      const response = await fetch("/api/admin/discount-banner", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to upload discount banner")
      }
      updateDiscountBannerDraft("bannerImageUrl", payload.bannerUrl || "")
    } catch (err: any) {
      setError(err.message || "Unable to upload discount banner")
    } finally {
      setDiscountBannerUploading(false)
      event.target.value = ""
    }
  }

  async function saveDiscountBannerDraft(draft: AdminDiscountBannerDraft, statusOverride?: AdminDiscountBannerDraft["status"]) {
    if (!sessionToken) return
    setDiscountBannerSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "discount_banner",
          ...draft,
          status: statusOverride || draft.status,
          discountPercent: Number(draft.discountPercent) || 0,
          startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
          endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save discount banner")
      }
      setDiscountBannerDraft(createEmptyDiscountBannerDraft())
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save discount banner")
    } finally {
      setDiscountBannerSaving(false)
    }
  }

  async function saveDiscountBanner(statusOverride?: AdminDiscountBannerDraft["status"]) {
    await saveDiscountBannerDraft(discountBannerDraft, statusOverride)
  }

  function handleEditDiscountBanner(item: AdminDiscountBannerItem) {
    setDiscountBannerDraft(discountBannerToDraft(item))
  }

  function updateUserDiscountDraft<K extends keyof AdminUserDiscountDraft>(key: K, value: AdminUserDiscountDraft[K]) {
    setUserDiscountDraft((previous) => ({ ...previous, [key]: value }))
  }

  async function saveUserDiscountDraft(draft: AdminUserDiscountDraft, statusOverride?: AdminUserDiscountDraft["status"]) {
    if (!sessionToken) return
    setUserDiscountSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_discount",
          ...draft,
          publicId: draft.publicId.trim().toUpperCase(),
          planId: draft.planId || null,
          status: statusOverride || draft.status,
          discountPercent: Number(draft.discountPercent) || 0,
          startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
          endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save user discount")
      }
      setUserDiscountDraft(createEmptyUserDiscountDraft())
      setRefreshIndex((value) => value + 1)
    } catch (err: any) {
      setError(err.message || "Unable to save user discount")
    } finally {
      setUserDiscountSaving(false)
    }
  }

  async function saveUserDiscount(statusOverride?: AdminUserDiscountDraft["status"]) {
    await saveUserDiscountDraft(userDiscountDraft, statusOverride)
  }

  function handleEditUserDiscount(item: AdminUserDiscountItem) {
    setUserDiscountDraft(userDiscountToDraft(item))
  }

  if (loading && !sessionToken) {
    return (
      <main className="luxe-page flex min-h-screen items-center justify-center px-4">
        <div className="luxe-dark-card rounded-[2rem] p-8 text-center text-[#ffffff]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E83262] border-t-transparent" />
          <p className="mt-4 font-semibold">Opening admin portal...</p>
        </div>
      </main>
    )
  }

  if (!sessionToken) {
    return (
      <main className="luxe-light-page flex min-h-screen items-center justify-center px-4 py-10">
        <section className="grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-[#DDE4EE] bg-white shadow-[0_28px_90px_rgba(38,54,74,0.12)] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="hidden min-h-[38rem] flex-col justify-between border-r border-[#E6EAF1] bg-[#F7F9FC] p-10 text-[#26364A] lg:flex">
            <div>
              <div className="mb-8 inline-flex items-center gap-3 rounded-xl border border-[#E6EAF1] bg-white px-3 py-2 shadow-sm">
                <img src="/lovesathi-logo.png" alt="LoveSathi" className="h-12 w-auto object-contain" />
              </div>
              <p className="luxe-kicker mb-4 text-[#E83262]">admin workspace</p>
              <h1 className="max-w-xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[#172235]">
                A calmer CRM for member operations.
              </h1>
              <p className="mt-5 max-w-lg text-base font-medium leading-8 text-[#6F7C8B]">
                Work through profile quality, safety, events, and premium follow-up from one structured control surface.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Member queues", icon: Users },
                { label: "Profile review", icon: UserRoundCheck },
                { label: "Safety desk", icon: ShieldCheck },
                { label: "Events desk", icon: CalendarDays },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#E6EAF1] bg-white p-4 shadow-sm">
                  <item.icon className="mb-3 h-5 w-5 text-[#E83262]" />
                  <p className="text-sm font-black text-[#26364A]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-7 sm:p-12">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172235] text-white shadow-[0_18px_40px_rgba(23,34,53,0.18)]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="luxe-kicker mb-2 text-[#E83262]">secure access</p>
                <h2 className="text-4xl font-black tracking-[-0.05em] text-[#172235]">Admin sign in</h2>
                <p className="mt-3 max-w-md text-sm font-medium leading-6 text-[#6F7C8B]">
                  Use a Supabase account listed in the production ADMIN_EMAILS allowlist.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="rounded-2xl bg-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="rounded-2xl bg-white"
                  required
                />
              </div>
              {error && (
                <div className="rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-3 text-sm font-bold text-[#C3264E]">
                  {error}
                </div>
              )}
              <Button className="h-[3.25rem] w-full rounded-2xl font-bold" disabled={authLoading}>
                {authLoading ? "Signing in..." : "Enter admin workspace"}
              </Button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[#26364A]">
      <div className="mx-auto grid min-h-screen max-w-[104rem] lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#E1E7EF] bg-[#FFFFFF] px-4 py-5 lg:block">
          <div className="sticky top-5 flex h-[calc(100dvh-2.5rem)] flex-col">
            <Link href="/" className="mb-6 inline-flex rounded-xl border border-[#E6EAF1] bg-white px-3 py-2 no-underline shadow-sm">
              <img src="/lovesathi-logo.png" alt="LoveSathi" className="h-12 w-auto object-contain" />
            </Link>
            <div className="rounded-2xl border border-[#E6EAF1] bg-[#F7F9FC] p-4">
              <p className="luxe-kicker text-[#E83262]">live lane</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#172235]">{currentNavItem.label}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#6F7C8B]">
                {currentSection === "overview" ? selectedQueueFilter.detail : "Focused module view"}
              </p>
            </div>
            <nav className="mt-5 space-y-1.5" aria-label="Admin workspace sections">
              {adminNavItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={
                    item.id === currentSection
                      ? "group flex items-center justify-between rounded-xl bg-[#172235] px-3 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition"
                      : "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-[#526071] no-underline transition hover:bg-[#FFF4F7] hover:text-[#E83262]"
                  }
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <item.icon
                      className={
                        item.id === currentSection
                          ? "h-4 w-4 shrink-0 text-[#F7C9D5]"
                          : "h-4 w-4 shrink-0 text-[#8B98A8] transition group-hover:text-[#E83262]"
                      }
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span
                    className={
                      item.id === currentSection
                        ? "rounded-full bg-white/12 px-2 py-0.5 text-[0.68rem] font-black text-white"
                        : "rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[0.68rem] font-black text-[#6F7C8B]"
                    }
                  >
                    {item.count.toLocaleString("en-IN")}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto rounded-2xl border border-[#E6EAF1] bg-[#172235] p-4 text-white">
              <ShieldCheck className="h-5 w-5 text-[#F04775]" />
              <p className="mt-3 text-sm font-bold">Role gated workspace</p>
              <p className="mt-2 text-xs leading-5 text-white/70">Every mutation still passes API allowlist checks and audit logging.</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#E1E7EF] bg-white/92 px-4 py-4 shadow-[0_12px_34px_rgba(38,54,74,0.06)] backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="luxe-kicker mb-2 text-[#E83262]">Lovesathi admin</p>
                <h1 className="text-3xl font-black tracking-[-0.05em] text-[#172235] sm:text-4xl">
                  Operations CRM
                </h1>
                <p className="mt-2 truncate text-sm font-medium text-[#6F7C8B]">
                  {overview?.admin.email || "admin"} {generatedAt ? `- refreshed ${generatedAt}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B98A8]" />
                  <Input
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    placeholder="Search members, profiles, events..."
                    className="rounded-2xl border-[#DDE4EE] bg-[#F7F9FC] pl-10 text-sm shadow-none"
                  />
                </div>
                <Button
                  variant="outline"
                  className="rounded-2xl border-[#DDE4EE] bg-white"
                  onClick={() => setRefreshIndex((value) => value + 1)}
                  disabled={refreshing}
                >
                  <RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                  Refresh
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-[#DDE4EE] bg-white">
                  <Link href="https://lovesathi.com">
                    View site
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="rounded-2xl" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-[1.5rem] border border-[#E83262]/20 bg-[#E83262]/10 p-4 font-semibold text-[#E83262]">
            {error}
          </div>
        )}

        <section id="overview" className={currentSection === "overview" ? "scroll-mt-28 rounded-[1.5rem] border border-[#DDE4EE] bg-[#ffffff] p-5 shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-2 text-[#E83262]">command priorities</p>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A] sm:text-4xl">
                What needs admin attention today
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#6F7C8B]">
              A launch-safe queue view for reports, profile review, ID checks, email confirmation health, premium
              controls, and recent admin activity.
            </p>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {dashboardKpis.map((item, index) => {
              const Icon = [Users, Activity, Crown, CalendarDays, ShieldCheck, UserCheck][index % 6]
              return (
                <div key={item.label} className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#E83262] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-4 font-serif text-4xl font-bold tracking-[-0.06em] text-[#172235]">
                    {item.value.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#26364A]">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[#6F7C8B]">{item.detail}</p>
                </div>
              )
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.risk || []).map((item, index) => {
              const Icon = riskIcons[index % riskIcons.length]
              const isUrgent = item.severity === "urgent"
              const isWatch = item.severity === "watch"
              return (
                <div
                  key={item.label}
                  className={
                    isUrgent
                      ? "rounded-[1.5rem] border border-[#E83262]/18 bg-[#E83262]/8 p-4"
                      : isWatch
                        ? "rounded-[1.5rem] border border-[#E83262]/24 bg-[#E83262]/10 p-4"
                        : "rounded-[1.5rem] border border-[#1b6b43]/14 bg-[#1b6b43]/7 p-4"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          isUrgent
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E83262] text-white"
                            : isWatch
                              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E83262] text-white"
                              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b6b43] text-white"
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-bold text-[#26364A]">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-4xl font-bold tracking-[-0.06em] text-[#26364A]">
                        {item.value.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#9d7a55]">
                        {item.severity}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className={currentSection === "overview" ? "rounded-[1.5rem] border border-[#DDE4EE] bg-[#ffffff] p-4 shadow-[0_18px_52px_rgba(38,54,74,0.06)] sm:p-5" : "hidden"}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="luxe-kicker mb-2 text-[#E83262]">operations lanes</p>
              <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">
                Focus the command room
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#6F7C8B]">
              Use these lanes during launch review so support, safety, profile quality, and concierge work do not get
              mixed together.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            {queueFilters.map((filter) => {
              const isActive = queueFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQueueFilter(filter.id)}
                  className={
                    isActive
                      ? "rounded-2xl border border-[#172235] bg-[#172235] p-3 text-left text-white shadow-[0_16px_36px_rgba(23,34,53,0.18)] transition hover:-translate-y-0.5"
                      : "rounded-2xl border border-[#DDE4EE] bg-[#F7F9FC] p-3 text-left text-[#26364A] transition hover:-translate-y-0.5 hover:border-[#E83262]/35 hover:bg-white"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">{filter.label}</p>
                    <span
                      className={
                        isActive
                          ? "rounded-full bg-[#E83262] px-2.5 py-1 text-xs font-black text-white"
                          : "rounded-full bg-[#E83262]/12 px-2.5 py-1 text-xs font-black text-[#8a641f]"
                      }
                    >
                      {filter.count.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className={isActive ? "mt-2 text-xs leading-5 text-white/70" : "mt-2 text-xs leading-5 text-[#6F7C8B]"}>
                    {filter.detail}
                  </p>
                </button>
              )
            })}
          </div>
          {paymentDueUsers.length > 0 && (
            <div className="mt-4 rounded-[1.35rem] border border-[#b45309]/20 bg-[#fff7ed] p-4 text-sm font-semibold leading-6 text-[#9a3412]">
              {paymentDueUsers.length.toLocaleString("en-IN")} premium member
              {paymentDueUsers.length === 1 ? "" : "s"} currently need renewal follow-up. Keep payment-provider wiring
              queued until the dedicated subscription phase.
            </div>
          )}
        </section>

        <section id="events" className={currentSection === "events" ? "scroll-mt-28" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#482b1a]/10 bg-[#26364A] text-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#F7C9D5]">public calendar</p>
                  <CardTitle className="flex items-center gap-3 font-serif text-3xl tracking-[-0.04em] text-white sm:text-4xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E83262] text-white">
                      <Megaphone className="h-5 w-5" />
                    </span>
                    Events publishing desk
                  </CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#eadcc8]">
                    Draft, publish, feature, and archive Lovesathi events for the public events page.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={overview?.queues.events.status || "pending"} />
                  <Badge variant="outline" className="rounded-full border-[#E83262]/45 bg-[#E83262]/15 px-4 py-2 text-[#F7C9D5]">
                    {publishedEventCount.toLocaleString("en-IN")} live
                  </Badge>
                  <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15">
                    <Link href="/events" target="_blank">
                      View events
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={handleEventSubmit} className="space-y-4 rounded-[1.6rem] border border-[#482b1a]/10 bg-white/72 p-4 shadow-[0_18px_48px_rgba(24,17,13,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">
                      {eventDraft.id ? "Edit event" : "New event"}
                    </p>
                    <h3 className="mt-1 font-serif text-3xl font-bold tracking-[-0.04em] text-[#26364A]">
                      {eventDraft.title || "Publish a premium event"}
                    </h3>
                  </div>
                  {eventDraft.id && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#482b1a]/15 bg-white"
                      onClick={() => setEventDraft(createEmptyEventDraft())}
                    >
                      <PlusCircle className="h-4 w-4" />
                      New
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Title</Label>
                    <Input
                      id="event-title"
                      value={eventDraft.title}
                      onChange={(event) => updateEventDraft("title", event.target.value)}
                      placeholder="LoveSathi premium meet-up"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-slug">Slug</Label>
                    <Input
                      id="event-slug"
                      value={eventDraft.slug}
                      onChange={(event) => updateEventDraft("slug", event.target.value)}
                      placeholder="auto-generated if blank"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-summary">Summary</Label>
                  <Textarea
                    id="event-summary"
                    value={eventDraft.summary}
                    onChange={(event) => updateEventDraft("summary", event.target.value)}
                    placeholder="A refined short description for the event card."
                    className="min-h-24"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-description">Details</Label>
                  <Textarea
                    id="event-description"
                    value={eventDraft.description}
                    onChange={(event) => updateEventDraft("description", event.target.value)}
                    placeholder="Agenda, who should attend, and what members can expect."
                    className="min-h-28"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-type">Type</Label>
                    <select
                      id="event-type"
                      value={eventDraft.eventType}
                      onChange={(event) => updateEventDraft("eventType", event.target.value as AdminEventType)}
                      className="h-12 w-full rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 text-sm font-semibold text-[#26364A] outline-none focus:border-[#E83262]"
                    >
                      {eventTypes.map((type) => (
                        <option key={type} value={type}>
                          {statusLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-status">Status</Label>
                    <select
                      id="event-status"
                      value={eventDraft.status}
                      onChange={(event) => updateEventDraft("status", event.target.value as AdminEventStatus)}
                      className="h-12 w-full rounded-2xl border border-[#482b1a]/15 bg-white/95 px-4 text-sm font-semibold text-[#26364A] outline-none focus:border-[#E83262]"
                    >
                      {eventStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-city">City</Label>
                    <Input
                      id="event-city"
                      value={eventDraft.city}
                      onChange={(event) => updateEventDraft("city", event.target.value)}
                      placeholder="Pune"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-venue">Venue</Label>
                    <Input
                      id="event-venue"
                      value={eventDraft.venue}
                      onChange={(event) => updateEventDraft("venue", event.target.value)}
                      placeholder="Private lounge or online"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-starts-at">Starts</Label>
                    <Input
                      id="event-starts-at"
                      type="datetime-local"
                      value={eventDraft.startsAt}
                      onChange={(event) => updateEventDraft("startsAt", event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-ends-at">Ends</Label>
                    <Input
                      id="event-ends-at"
                      type="datetime-local"
                      value={eventDraft.endsAt}
                      onChange={(event) => updateEventDraft("endsAt", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event-rsvp">RSVP URL</Label>
                    <Input
                      id="event-rsvp"
                      value={eventDraft.rsvpUrl}
                      onChange={(event) => updateEventDraft("rsvpUrl", event.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-whatsapp">WhatsApp URL</Label>
                    <Input
                      id="event-whatsapp"
                      value={eventDraft.whatsappUrl}
                      onChange={(event) => updateEventDraft("whatsappUrl", event.target.value)}
                      placeholder="Defaults to LoveSathi WhatsApp"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.35rem] border border-[#482b1a]/10 bg-[#F7F9FC] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label htmlFor="event-banner">Event banner</Label>
                      <p className="mt-1 text-xs font-semibold text-[#6F7C8B]">
                        Upload a designed visual or paste a hosted image URL.
                      </p>
                    </div>
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#E83262]/24 bg-white px-4 text-sm font-black text-[#E83262] transition hover:bg-[#FFF4F7]">
                      <Upload className="h-4 w-4" />
                      {eventBannerUploading ? "Uploading..." : "Upload"}
                      <input
                        id="event-banner"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={eventBannerUploading}
                        onChange={uploadEventBanner}
                      />
                    </label>
                  </div>
                  <Input
                    value={eventDraft.bannerUrl}
                    onChange={(event) => updateEventDraft("bannerUrl", event.target.value)}
                    placeholder="https://.../event-banner.webp"
                  />
                  {eventDraft.bannerUrl && (
                    <div className="overflow-hidden rounded-2xl border border-[#DDE4EE] bg-white">
                      <img src={eventDraft.bannerUrl} alt="" className="h-40 w-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="event-capacity">Capacity</Label>
                    <Input
                      id="event-capacity"
                      type="number"
                      min="1"
                      value={eventDraft.capacity}
                      onChange={(event) => updateEventDraft("capacity", event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#482b1a]/10 bg-white/80 px-4 text-sm font-bold text-[#26364A]">
                    <input
                      type="checkbox"
                      checked={eventDraft.isFeatured}
                      onChange={(event) => updateEventDraft("isFeatured", event.target.checked)}
                      className="h-4 w-4 accent-[#E83262]"
                    />
                    Feature event
                  </label>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="luxe-button rounded-full" disabled={eventSaving}>
                    <CheckCircle2 className="h-4 w-4" />
                    {eventSaving ? "Saving..." : "Save event"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#E83262]/30 bg-[#E83262]/10 text-[#E83262]"
                    disabled={eventSaving}
                    onClick={() => void saveEvent("published")}
                  >
                    <Rocket className="h-4 w-4" />
                    Publish
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#482b1a]/15 bg-white"
                    onClick={() => setEventDraft(createEmptyEventDraft())}
                  >
                    Clear
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                {overview?.queues.events.detail && (
                  <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.queues.events.detail}
                  </p>
                )}
                {filteredEvents.length ? (
                  filteredEvents.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] border border-[#482b1a]/10 bg-white/70 p-4 shadow-[0_16px_42px_rgba(24,17,13,0.05)]">
                      {item.bannerUrl && (
                        <div className="mb-4 overflow-hidden rounded-[1.15rem] border border-[#DDE4EE] bg-[#F7F9FC]">
                          <img src={item.bannerUrl} alt="" className="h-44 w-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={item.status} />
                            {item.isFeatured && (
                              <Badge variant="outline" className="border-[#E83262]/28 bg-[#E83262]/10 text-[#E83262]">
                                Featured
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-[#482b1a]/10 bg-white text-[#6F7C8B]">
                              {statusLabel(item.eventType)}
                            </Badge>
                          </div>
                          <h3 className="mt-3 font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#9d7a55]">
                            /events#{item.slug}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="rounded-full border-[#482b1a]/15 bg-white" onClick={() => handleEditEvent(item)}>
                            <PenLine className="h-4 w-4" />
                            Edit
                          </Button>
                          {item.status !== "published" ? (
                            <Button
                              size="sm"
                              className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                              disabled={eventSaving}
                              onClick={() => void saveEventDraft(eventToDraft(item), "published")}
                            >
                              Approve / Publish
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#482b1a]/15 bg-white"
                              disabled={eventSaving}
                              onClick={() => void saveEventDraft(eventToDraft(item), "draft")}
                            >
                              Unpublish
                            </Button>
                          )}
                          {item.status !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
                              disabled={eventSaving}
                              onClick={() => void saveEventDraft(eventToDraft(item), "archived")}
                            >
                              Reject / Archive
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-[#E83262]/30 bg-white text-[#C3264E]"
                            disabled={eventSaving}
                            onClick={() => setPendingEventDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm font-semibold text-[#6F7C8B] sm:grid-cols-2">
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[#E83262]" />
                          {formatDate(item.startsAt)}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#E83262]" />
                          {[item.city, item.venue].filter(Boolean).join(" - ")}
                        </span>
                        <span className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-[#E83262]" />
                          {item.capacity ? `${item.capacity.toLocaleString("en-IN")} seats` : "Capacity open"}
                        </span>
                        <span>Updated {formatDate(item.updatedAt)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#6F7C8B]">{item.summary}</p>
                      {(item.rsvpUrl || item.whatsappUrl) && (
                        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                          {item.rsvpUrl && (
                            <a href={item.rsvpUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#E83262]/20 bg-[#E83262]/10 px-3 py-2 text-[#E83262] no-underline">
                              RSVP link
                            </a>
                          )}
                          {item.whatsappUrl && (
                            <a href={item.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#482b1a]/10 bg-white px-3 py-2 text-[#26364A] no-underline">
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyState copy={searchTerm ? "No events match this admin search." : "No events have been created yet."} />
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="event-attendance" className={currentSection === "events" ? "grid scroll-mt-28 gap-5 xl:grid-cols-[1.1fr_0.9fr]" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">attendance desk</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Event registration list
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Review event attendees, contact details, approval state, and admin notes.
                  </p>
                </div>
                <StatusBadge status={overview?.operations.eventRegistrations.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.operations.eventRegistrations.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.operations.eventRegistrations.detail}
                </p>
              )}
              {searchedEventRegistrations.length ? (
                searchedEventRegistrations.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#172235]">
                          {item.attendeeName}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">{item.eventTitle}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8B98A8]">
                          Registered {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-[#6F7C8B] sm:grid-cols-2">
                      <span>{item.attendeeEmail || "Email not provided"}</span>
                      <span>{item.attendeePhone || "Phone not provided"}</span>
                    </div>
                    {item.notes && (
                      <p className="mt-3 rounded-2xl border border-[#DDE4EE] bg-white p-3 text-xs leading-5 text-[#6F7C8B]">
                        {item.notes}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_registration", item.id, "approved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#C3264E]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_registration", item.id, "rejected")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#DDE4EE] bg-white"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_registration", item.id, "canceled")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No event registrations match this search." : "No event registrations yet."} />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">event reports</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Reported events
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                    View reports connected to events and mark the review outcome.
                  </p>
                </div>
                <StatusBadge status={overview?.operations.eventReports.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.operations.eventReports.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.operations.eventReports.detail}
                </p>
              )}
              {searchedEventReports.length ? (
                searchedEventReports.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#E1E7EF] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#172235]">
                          {item.eventTitle}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#E83262]">{statusLabel(item.reason)}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#6F7C8B]">
                      {item.description || "No extra event report detail was provided."}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#9d7a55]">Submitted {formatDate(item.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_report", item.id, "resolved")}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#DDE4EE] bg-white"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_report", item.id, "reviewed")}
                      >
                        Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#C3264E]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("event_report", item.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No event reports match this search." : "No event reports need review."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className={currentSection === "overview" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "hidden"}>
          {(overview?.metrics || []).map((metric, index) => {
            const Icon = metricIcons[index % metricIcons.length]
            return (
              <Card key={metric.label} className="luxe-card rounded-[1.6rem] border-[#E83262]/24">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-bold text-[#6F7C8B]">{metric.label}</CardTitle>
                  <Icon className={metric.status === "ok" ? "h-5 w-5 text-[#E83262]" : "h-5 w-5 text-[#E83262]"} />
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-5xl font-bold tracking-[-0.05em] text-[#26364A]">
                    {metric.value.toLocaleString("en-IN")}
                  </p>
                  {metric.detail && <p className="mt-2 text-xs text-[#E83262]">{metric.detail}</p>}
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section id="plans" className={currentSection === "plans" ? "grid scroll-mt-28 gap-5 xl:grid-cols-[1fr_1fr]" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">plans management</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Premium plan catalog
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Current launch plans used by the app. Admin can grant or revoke these plans from User management.
                  </p>
                </div>
                <CreditCard className="h-6 w-6 text-[#E83262]" />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:p-6 lg:grid-cols-2">
              {planItems.map((plan) => {
                const draft = planPriceDrafts.find((item) => item.planId === plan.id) || planToPriceDraft(plan)
                return (
                  <div key={plan.id} className="rounded-[1.35rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#172235]">{plan.name}</p>
                        <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">{plan.durationLabel}</p>
                      </div>
                      <StatusBadge status={draft.isActive ? "active" : "archived"} />
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`plan-price-${plan.id}`}>Real price</Label>
                          <Input
                            id={`plan-price-${plan.id}`}
                            type="number"
                            min="1"
                            value={draft.priceAmount}
                            onChange={(event) => {
                              const amount = event.target.value
                              updatePlanPriceDraft(plan.id, "priceAmount", amount)
                              updatePlanPriceDraft(plan.id, "priceLabel", amount ? `INR ${Number(amount || 0).toLocaleString("en-IN")}` : "")
                            }}
                            className="rounded-2xl bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`plan-label-${plan.id}`}>Display price</Label>
                          <Input
                            id={`plan-label-${plan.id}`}
                            value={draft.priceLabel}
                            onChange={(event) => updatePlanPriceDraft(plan.id, "priceLabel", event.target.value)}
                            className="rounded-2xl bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`plan-duration-${plan.id}`}>Duration label</Label>
                        <Input
                          id={`plan-duration-${plan.id}`}
                          value={draft.durationLabel}
                          onChange={(event) => updatePlanPriceDraft(plan.id, "durationLabel", event.target.value)}
                          className="rounded-2xl bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updatePlanPriceDraft(plan.id, "isActive", !draft.isActive)}
                        className={
                          draft.isActive
                            ? "rounded-2xl border border-[#1b6b43]/20 bg-[#1b6b43]/10 p-3 text-left text-sm font-bold text-[#1b6b43]"
                            : "rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-3 text-left text-sm font-bold text-[#C3264E]"
                        }
                      >
                        {draft.isActive ? "Visible in premium catalog" : "Hidden from premium catalog"}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full bg-[#172235] text-white hover:bg-[#26364A]"
                        disabled={pricingSaving}
                        onClick={() => void savePlanPriceDraft(draft)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save price
                      </Button>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[#6F7C8B]">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-[#E83262]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
              <CardHeader className="border-b border-[#E1E7EF]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">discount banner</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                      Public offer message
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                      Optional seasonal offers only appear when this banner is published. There is no default discount.
                    </p>
                  </div>
                  <Megaphone className="h-6 w-6 text-[#E83262]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="discount-title">Offer title</Label>
                    <Input
                      id="discount-title"
                      value={discountBannerDraft.title}
                      onChange={(event) => updateDiscountBannerDraft("title", event.target.value)}
                      placeholder="Eid offer, Christmas offer..."
                      className="rounded-2xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-percent">Discount percentage</Label>
                    <Input
                      id="discount-percent"
                      type="number"
                      min="0"
                      max="100"
                      value={discountBannerDraft.discountPercent}
                      onChange={(event) => updateDiscountBannerDraft("discountPercent", event.target.value)}
                      className="rounded-2xl bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-copy">Banner text</Label>
                  <Textarea
                    id="discount-copy"
                    value={discountBannerDraft.bannerText}
                    onChange={(event) => updateDiscountBannerDraft("bannerText", event.target.value)}
                    className="min-h-24 rounded-2xl bg-white"
                    placeholder="Write the offer copy users should see."
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="discount-starts">Starts</Label>
                    <Input
                      id="discount-starts"
                      type="datetime-local"
                      value={discountBannerDraft.startsAt}
                      onChange={(event) => updateDiscountBannerDraft("startsAt", event.target.value)}
                      className="rounded-2xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-ends">Ends</Label>
                    <Input
                      id="discount-ends"
                      type="datetime-local"
                      value={discountBannerDraft.endsAt}
                      onChange={(event) => updateDiscountBannerDraft("endsAt", event.target.value)}
                      className="rounded-2xl bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plans included</Label>
                  <div className="flex flex-wrap gap-2">
                    {planItems.map((plan) => (
                      <Button
                        key={plan.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={
                          discountBannerDraft.planIds.includes(plan.id)
                            ? "rounded-full border-[#E83262] bg-[#FFF4F7] text-[#C3264E]"
                            : "rounded-full border-[#DDE4EE] bg-white"
                        }
                        onClick={() => toggleDiscountBannerPlan(plan.id)}
                      >
                        {plan.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="discount-image-url">Banner image URL</Label>
                    <Input
                      id="discount-image-url"
                      value={discountBannerDraft.bannerImageUrl}
                      onChange={(event) => updateDiscountBannerDraft("bannerImageUrl", event.target.value)}
                      className="rounded-2xl bg-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount-banner-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#DDE4EE] bg-white px-4 py-2 text-sm font-bold text-[#26364A]">
                      <Upload className="h-4 w-4 text-[#E83262]" />
                      {discountBannerUploading ? "Uploading..." : "Upload banner image"}
                    </Label>
                    <input
                      id="discount-banner-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void uploadDiscountBanner(event)}
                    />
                  </div>
                </div>
                {discountBannerDraft.bannerImageUrl && (
                  <div className="overflow-hidden rounded-[1.25rem] border border-[#DDE4EE] bg-[#F7F9FC]">
                    <img src={discountBannerDraft.bannerImageUrl} alt="" className="h-36 w-full object-cover" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button className="luxe-button rounded-full" disabled={discountBannerSaving} onClick={() => void saveDiscountBanner()}>
                    <Save className="mr-2 h-4 w-4" />
                    Save draft
                  </Button>
                  <Button className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]" disabled={discountBannerSaving} onClick={() => void saveDiscountBanner("published")}>
                    Publish
                  </Button>
                  <Button variant="outline" className="rounded-full border-[#DDE4EE] bg-white" onClick={() => setDiscountBannerDraft(createEmptyDiscountBannerDraft())}>
                    Clear
                  </Button>
                </div>
                <div className="space-y-3">
                  {searchedDiscountBanners.length ? (
                    searchedDiscountBanners.map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#26364A]">{item.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[#6F7C8B]">{item.bannerText}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#9d7a55]">
                          {item.discountPercent}% off | {item.planIds.length ? item.planIds.join(", ") : "All plans"} | Updated {formatDate(item.updatedAt)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-full border-[#DDE4EE] bg-white" onClick={() => handleEditDiscountBanner(item)}>
                            <PenLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {item.status !== "archived" && (
                            <Button size="sm" variant="outline" className="rounded-full border-[#E83262]/20 bg-[#FFF4F7] text-[#C3264E]" onClick={() => {
                              const draft = discountBannerToDraft(item)
                              setDiscountBannerDraft(draft)
                              void saveDiscountBannerDraft(draft, "archived")
                            }}>
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState copy="No discount banners have been created yet." />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
              <CardHeader className="border-b border-[#E1E7EF]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">user discount</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                      Individual grants
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                      Grant a private discount by public profile ID. Use member search above to find the ID, phone, or email first.
                    </p>
                  </div>
                  <Ticket className="h-6 w-6 text-[#E83262]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="user-discount-user">Public profile ID</Label>
                    <Input
                      id="user-discount-user"
                      value={userDiscountDraft.publicId}
                      onChange={(event) => updateUserDiscountDraft("publicId", event.target.value.toUpperCase())}
                      className="rounded-2xl bg-white"
                      placeholder="LSMUMF001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-title">Title</Label>
                    <Input
                      id="user-discount-title"
                      value={userDiscountDraft.title}
                      onChange={(event) => updateUserDiscountDraft("title", event.target.value)}
                      className="rounded-2xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-percent">Discount percentage</Label>
                    <Input
                      id="user-discount-percent"
                      type="number"
                      min="1"
                      max="100"
                      value={userDiscountDraft.discountPercent}
                      onChange={(event) => updateUserDiscountDraft("discountPercent", event.target.value)}
                      className="rounded-2xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-plan">Plan</Label>
                    <select
                      id="user-discount-plan"
                      value={userDiscountDraft.planId}
                      onChange={(event) => updateUserDiscountDraft("planId", event.target.value)}
                      className="h-10 w-full rounded-2xl border border-[#DDE4EE] bg-white px-3 text-sm font-semibold text-[#26364A]"
                    >
                      <option value="">All plans</option>
                      {planItems.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-status">Status</Label>
                    <select
                      id="user-discount-status"
                      value={userDiscountDraft.status}
                      onChange={(event) => updateUserDiscountDraft("status", event.target.value as AdminUserDiscountDraft["status"])}
                      className="h-10 w-full rounded-2xl border border-[#DDE4EE] bg-white px-3 text-sm font-semibold text-[#26364A]"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-starts">Starts</Label>
                    <Input id="user-discount-starts" type="datetime-local" value={userDiscountDraft.startsAt} onChange={(event) => updateUserDiscountDraft("startsAt", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-discount-ends">Ends</Label>
                    <Input id="user-discount-ends" type="datetime-local" value={userDiscountDraft.endsAt} onChange={(event) => updateUserDiscountDraft("endsAt", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-discount-notes">Internal note</Label>
                  <Textarea id="user-discount-notes" value={userDiscountDraft.notes} onChange={(event) => updateUserDiscountDraft("notes", event.target.value)} className="min-h-24 rounded-2xl bg-white" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="luxe-button rounded-full" disabled={userDiscountSaving} onClick={() => void saveUserDiscount()}>
                    <Save className="mr-2 h-4 w-4" />
                    Save user discount
                  </Button>
                  <Button variant="outline" className="rounded-full border-[#DDE4EE] bg-white" onClick={() => setUserDiscountDraft(createEmptyUserDiscountDraft())}>
                    Clear
                  </Button>
                </div>
                <div className="space-y-3">
                  {searchedUserDiscounts.length ? (
                    searchedUserDiscounts.map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#26364A]">{item.profileName || item.userEmail || item.publicId || "Member"}</p>
                            <p className="mt-1 text-sm text-[#6F7C8B]">{item.title} | {item.discountPercent}% off {item.planId || "all plans"}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9d7a55]">
                          ID - {item.publicId || "Pending"}
                        </p>
                        {item.notes && <p className="mt-2 text-xs leading-5 text-[#6F7C8B]">{item.notes}</p>}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-full border-[#DDE4EE] bg-white" onClick={() => handleEditUserDiscount(item)}>
                            <PenLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {item.status === "active" && (
                            <Button size="sm" variant="outline" className="rounded-full border-[#E83262]/20 bg-[#FFF4F7] text-[#C3264E]" onClick={() => {
                              const draft = userDiscountToDraft(item)
                              setUserDiscountDraft(draft)
                              void saveUserDiscountDraft(draft, "revoked")
                            }}>
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState copy="No individual discounts have been granted yet." />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
              <CardHeader className="border-b border-[#E1E7EF]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">active subscriptions</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                      Premium memberships
                    </CardTitle>
                  </div>
                  <StatusBadge status={overview?.operations.activeSubscriptions.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-5 sm:p-6">
                {overview?.operations.activeSubscriptions.detail && (
                  <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.operations.activeSubscriptions.detail}
                  </p>
                )}
                {activeSubscriptionItems.length ? (
                  activeSubscriptionItems.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#172235]">{item.profileName || item.userEmail || "Member"}</p>
                          <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">
                            {item.planName || item.planId || "Plan pending"} - {item.source || "admin"}
                          </p>
                        </div>
                        <StatusBadge status={item.paymentDue ? "past_due" : item.status || "active"} />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">
                        Active until {formatDate(item.activeUntil)} | Grace until {formatDate(item.graceUntil)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState copy="No active premium memberships are visible yet." />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
              <CardHeader className="border-b border-[#E1E7EF]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">payment history</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                      Entitlement ledger
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                      Payment provider records are not connected in this phase; this shows admin entitlements and renewal states.
                    </p>
                  </div>
                  <StatusBadge status={overview?.operations.paymentHistory.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-5 sm:p-6">
                {overview?.operations.paymentHistory.detail && (
                  <p className="rounded-2xl border border-[#b45309]/20 bg-[#fff7ed] p-3 text-sm font-semibold text-[#9a3412]">
                    {overview.operations.paymentHistory.detail}
                  </p>
                )}
                {paymentHistoryItems.length ? (
                  paymentHistoryItems.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-[1.25rem] border border-[#E1E7EF] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-[#172235]">{item.profileName || item.userEmail || "Member account"}</p>
                        <p className="text-sm font-semibold text-[#6F7C8B]">
                          {item.planName || item.planId || "Plan pending"} - {item.source || "unknown source"}
                        </p>
                      </div>
                      <StatusBadge status={item.status || "pending"} />
                    </div>
                  ))
                ) : (
                  <EmptyState copy="No entitlement ledger rows are available yet." />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="notifications" className={currentSection === "notifications" ? "grid scroll-mt-28 gap-5 xl:grid-cols-[0.85fr_1.15fr]" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">notifications</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Campaign composer
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                    Save push, email, or SMS campaign records for provider handoff.
                  </p>
                </div>
                <Bell className="h-6 w-6 text-[#E83262]" />
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveNotification("draft")
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="notification-channel">Channel</Label>
                    <select
                      id="notification-channel"
                      value={notificationDraft.channel}
                      onChange={(event) => updateNotificationDraft("channel", event.target.value as AdminNotificationDraft["channel"])}
                      className="h-12 w-full rounded-2xl border border-[#DDE4EE] bg-white px-4 text-sm font-semibold text-[#26364A] outline-none focus:border-[#E83262]"
                    >
                      <option value="push">Push</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notification-audience">Audience</Label>
                    <Input
                      id="notification-audience"
                      value={notificationDraft.audience}
                      onChange={(event) => updateNotificationDraft("audience", event.target.value)}
                      placeholder="all, premium, pending_profiles"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-title">Title</Label>
                  <Input
                    id="notification-title"
                    value={notificationDraft.title}
                    onChange={(event) => updateNotificationDraft("title", event.target.value)}
                    placeholder="Profile verification reminder"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-body">Message</Label>
                  <Textarea
                    id="notification-body"
                    value={notificationDraft.body}
                    onChange={(event) => updateNotificationDraft("body", event.target.value)}
                    className="min-h-32"
                    placeholder="Write the campaign message..."
                    required
                  />
                </div>
                <div className="rounded-2xl border border-[#b45309]/20 bg-[#fff7ed] p-3 text-xs font-semibold leading-5 text-[#9a3412]">
                  Provider delivery is not wired here yet. “Mark sent” records the campaign as sent for manual handoff only.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="rounded-full" disabled={notificationSaving}>
                    <Save className="h-4 w-4" />
                    {notificationSaving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#E83262]/24 bg-[#E83262]/10 text-[#E83262]"
                    disabled={notificationSaving}
                    onClick={() => void saveNotification("sent")}
                  >
                    <Send className="h-4 w-4" />
                    Mark sent
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">campaign history</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Recent notifications
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.operations.notificationCampaigns.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.operations.notificationCampaigns.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.operations.notificationCampaigns.detail}
                </p>
              )}
              {searchedNotifications.length ? (
                searchedNotifications.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#172235]">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">
                          {statusLabel(item.channel)} to {item.audience}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6F7C8B]">{item.body}</p>
                    <p className="mt-2 text-xs font-semibold text-[#9d7a55]">
                      Created {formatDate(item.createdAt)}
                      {item.sentAt ? ` | Marked sent ${formatDate(item.sentAt)}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No notification campaigns match this search." : "No notification campaigns yet."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="settings" className={currentSection === "settings" || currentSection === "stories" ? "grid scroll-mt-28 gap-5" : "hidden"}>
          <Card className={currentSection === "settings" ? "overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">site settings</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Contact and social links
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                    Update support contact details and social channels from one place.
                  </p>
                </div>
                <Settings className="h-6 w-6 text-[#E83262]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              {overview?.operations.siteSettings.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.operations.siteSettings.detail}
                </p>
              )}
              {siteSettingDrafts.length ? (
                <div className="space-y-3">
                  {siteSettingDrafts.map((item) => (
                    <div key={item.key} className="space-y-2 rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label htmlFor={`setting-${item.key}`}>{item.label}</Label>
                        <Badge variant="outline" className="border-[#DDE4EE] bg-white text-[#6F7C8B]">
                          {statusLabel(item.category)}
                        </Badge>
                      </div>
                      <Input
                        id={`setting-${item.key}`}
                        value={item.value}
                        onChange={(event) => updateSiteSettingDraft(item.key, event.target.value)}
                        placeholder={item.key}
                      />
                      <p className="text-xs font-semibold text-[#9d7a55]">Key: {item.key}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState copy="No site settings are available yet. Run the latest migration to create contact and social settings." />
              )}
              <Button className="rounded-full" disabled={settingsSaving || siteSettingDrafts.length === 0} onClick={saveSiteSettings}>
                <Save className="h-4 w-4" />
                {settingsSaving ? "Saving..." : "Save settings"}
              </Button>
            </CardContent>
          </Card>

          <Card id="stories" className={currentSection === "stories" ? "scroll-mt-28 overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
            <CardHeader className="border-b border-[#E1E7EF]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">success stories</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Marriage story publishing
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                    Create, edit, publish, or archive success stories for the public website.
                  </p>
                </div>
                <StatusBadge status={overview?.operations.successStories.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.85fr_1.15fr]">
              <form
                className="space-y-4 rounded-[1.35rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveSuccessStory()
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E83262]">
                      {successStoryDraft.id ? "Edit story" : "New story"}
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-[#172235]">
                      {successStoryDraft.coupleNames || "Celebrate a couple"}
                    </h3>
                  </div>
                  {successStoryDraft.id && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#DDE4EE] bg-white"
                      onClick={() => setSuccessStoryDraft(createEmptySuccessStoryDraft())}
                    >
                      <PlusCircle className="h-4 w-4" />
                      New
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="story-couple">Couple names</Label>
                    <Input
                      id="story-couple"
                      value={successStoryDraft.coupleNames}
                      onChange={(event) => updateSuccessStoryDraft("coupleNames", event.target.value)}
                      placeholder="Aarav & Siya"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-city">City</Label>
                    <Input
                      id="story-city"
                      value={successStoryDraft.city}
                      onChange={(event) => updateSuccessStoryDraft("city", event.target.value)}
                      placeholder="Pune"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story-body">Story</Label>
                  <Textarea
                    id="story-body"
                    value={successStoryDraft.story}
                    onChange={(event) => updateSuccessStoryDraft("story", event.target.value)}
                    className="min-h-32"
                    placeholder="Write the couple story..."
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="story-image">Image URL</Label>
                    <Input
                      id="story-image"
                      value={successStoryDraft.imageUrl}
                      onChange={(event) => updateSuccessStoryDraft("imageUrl", event.target.value)}
                      placeholder="Optional hosted visual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-date">Wedding date</Label>
                    <Input
                      id="story-date"
                      type="date"
                      value={successStoryDraft.weddingDate}
                      onChange={(event) => updateSuccessStoryDraft("weddingDate", event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="story-status">Status</Label>
                    <select
                      id="story-status"
                      value={successStoryDraft.status}
                      onChange={(event) => updateSuccessStoryDraft("status", event.target.value as AdminSuccessStoryDraft["status"])}
                      className="h-12 w-full rounded-2xl border border-[#DDE4EE] bg-white px-4 text-sm font-semibold text-[#26364A] outline-none focus:border-[#E83262]"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="story-order">Display order</Label>
                    <Input
                      id="story-order"
                      type="number"
                      value={successStoryDraft.displayOrder}
                      onChange={(event) => updateSuccessStoryDraft("displayOrder", event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="rounded-full" disabled={successStorySaving}>
                    <Save className="h-4 w-4" />
                    {successStorySaving ? "Saving..." : "Save story"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#E83262]/24 bg-[#E83262]/10 text-[#E83262]"
                    disabled={successStorySaving}
                    onClick={() => void saveSuccessStory("published")}
                  >
                    Publish
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                {overview?.operations.successStories.detail && (
                  <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.operations.successStories.detail}
                  </p>
                )}
                {searchedSuccessStories.length ? (
                  searchedSuccessStories.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#E1E7EF] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#172235]">
                            {item.coupleNames}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#6F7C8B]">
                            {[item.city, item.weddingDate].filter(Boolean).join(" - ") || "Story detail pending"}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6F7C8B]">{item.story}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-[#DDE4EE] bg-white"
                          onClick={() => handleEditSuccessStory(item)}
                        >
                          <PenLine className="h-4 w-4" />
                          Edit
                        </Button>
                        {item.status !== "published" && (
                          <Button
                            size="sm"
                            className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                            disabled={successStorySaving}
                            onClick={() => void saveSuccessStoryDraft(successStoryToDraft(item), "published")}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState copy={searchTerm ? "No success stories match this search." : "No success stories have been created yet."} />
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="members" className={currentSection === "members" ? "scroll-mt-28" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/55">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">member operations</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A] sm:text-4xl">
                    User management
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Inspect loaded Supabase Auth users, email confirmation state, profile completion, review status,
                    and suspend, restore, or delete access with an audit note.
                  </p>
                  {queueFilter !== "all" && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E83262]">
                      Showing {statusLabel(queueFilter)} lane
                    </p>
                  )}
                </div>
                <StatusBadge status={overview?.queues.users.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {overview?.queues.users.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.users.detail}
                </p>
              )}
              {filteredUsers.length ? (
                <div className="overflow-hidden rounded-[1.25rem] border border-[#E1E7EF] bg-white">
                  <div className="hidden grid-cols-[minmax(15rem,1.25fr)_0.7fr_0.8fr_0.9fr_minmax(18rem,1.2fr)] gap-4 border-b border-[#E1E7EF] bg-[#F7F9FC] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#6F7C8B] xl:grid">
                    <span>Member</span>
                    <span>Profile</span>
                    <span>Email</span>
                    <span>Plan</span>
                    <span>Actions</span>
                  </div>
                  <div className="divide-y divide-[#E1E7EF]">
                    {filteredUsers.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-4 px-4 py-4 text-sm xl:grid-cols-[minmax(15rem,1.25fr)_0.7fr_0.8fr_0.9fr_minmax(18rem,1.2fr)] xl:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-black text-[#172235]">{item.email || "Email unavailable"}</p>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-[#6F7C8B]">
                            {item.profileName || "No matrimony profile yet"}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8B98A8]">
                            ID - {item.publicId || "Pending"}
                          </p>
                          {item.phone && <p className="mt-1 text-xs font-semibold text-[#9d7a55]">{item.phone}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 xl:block">
                          {item.profileReviewStatus && <StatusBadge status={item.profileReviewStatus} />}
                          <p className="mt-1 text-xs font-semibold text-[#6F7C8B]">
                            {item.profileCompleted ? "Complete" : "Draft or missing"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#6F7C8B]">{item.emailConfirmedAt ? "Confirmed" : "Not confirmed"}</p>
                          <p className="mt-1 text-xs font-semibold text-[#8B98A8]">{item.provider || "email"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={item.premium.isPremium ? "premium" : "free"} />
                          {item.premium.planName && (
                            <Badge variant="outline" className="border-[#E83262]/24 bg-[#FFF4F7] text-[#C3264E]">
                              {item.premium.planName}
                            </Badge>
                          )}
                          {item.premium.paymentDue && (
                            <Badge variant="outline" className="border-[#b45309]/25 bg-[#fff7ed] text-[#9a3412]">
                              Renewal due
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.status === "suspended" ? (
                            <Button
                              size="sm"
                              className="rounded-xl bg-[#1b6b43] text-white hover:bg-[#155333]"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("user", item.id, "active")}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Restore
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#E83262]/20 bg-[#FFF4F7] text-[#C3264E]"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("user", item.id, "suspended")}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </Button>
                          )}
                          {!item.emailConfirmedAt && item.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#E83262]/20 bg-white"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("auth_email", item.id, "resend_confirmation")}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Resend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-[#E83262]/30 bg-white text-[#C3264E]"
                            disabled={Boolean(actionKey)}
                            onClick={() => handleAction("user", item.id, "deleted")}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                          {item.premium.isPremium && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#E83262]/20 bg-white text-[#C3264E]"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("entitlement", item.id, "canceled")}
                            >
                              Revoke
                            </Button>
                          )}
                          {item.premium.isPremium && !item.premium.paymentDue && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#b45309]/24 bg-[#fff7ed] text-[#9a3412]"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("entitlement", item.id, "past_due")}
                            >
                              <Clock3 className="mr-2 h-4 w-4" />
                              Due
                            </Button>
                          )}
                          {SUBSCRIPTION_PLANS.map((plan) => (
                            <Button
                              key={plan.id}
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-[#DDE4EE] bg-white text-[#26364A]"
                              disabled={Boolean(actionKey)}
                              onClick={() => handleAction("entitlement", item.id, "active", { planId: plan.id })}
                            >
                              <Crown className="mr-2 h-4 w-4 text-[#E83262]" />
                              {plan.name}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-[#E83262]/24 bg-[#FFF4F7] text-[#C3264E]"
                            onClick={() => {
                              setUserDiscountDraft({
                                ...createEmptyUserDiscountDraft(),
                                publicId: item.publicId || "",
                                title: item.profileName ? `${item.profileName} private offer` : "Private discount",
                              })
                            }}
                            disabled={!item.publicId}
                          >
                            <Ticket className="mr-2 h-4 w-4" />
                            Discount
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState copy={searchTerm ? "No users match this admin search." : "No auth users were returned yet."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="premium" className={currentSection === "premium" ? "scroll-mt-28" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#482b1a]/10 bg-[#26364A] text-white">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">heritage concierge</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-white sm:text-4xl">
                    High-touch member desk
                  </CardTitle>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#eadcc8]">
                    Heritage members need human follow-through: renewal grace, handpicked match care, and concierge
                    notes should be easy to spot before payment automation arrives.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full border-[#E83262]/45 bg-[#E83262]/15 px-4 py-2 text-[#E83262]">
                  {heritageUsers.length.toLocaleString("en-IN")} Heritage visible
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {heritageUsers.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {heritageUsers.map((item) => (
                    <div key={item.id} className="rounded-[1.5rem] border border-[#E83262]/24 bg-white/72 p-4 shadow-[0_16px_42px_rgba(24,17,13,0.04)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                            {item.profileName || "Profile name pending"}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-[#6F7C8B]">
                            {item.email || "Email unavailable"}
                          </p>
                        </div>
                        <StatusBadge status={item.premium.status || "heritage"} />
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6F7C8B] sm:grid-cols-2">
                        <span>Active until: {formatDate(item.premium.activeUntil)}</span>
                        <span>Grace until: {formatDate(item.premium.graceUntil)}</span>
                        <span>Renewal due: {formatDate(item.premium.renewalDueAt)}</span>
                        <span>Source: {item.premium.source || "manual/admin"}</span>
                      </div>
                      <div className="mt-4 rounded-[1.2rem] border border-[#E83262]/20 bg-[#F6F7FB] p-4 text-sm leading-6 text-[#6F7C8B]">
                        Next concierge action: confirm this member has an assigned relationship executive, a fresh
                        handpicked shortlist, and payment follow-up if the grace window is active.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.premium.paymentDue && (
                          <Badge variant="outline" className="border-[#b45309]/25 bg-[#fff7ed] text-[#9a3412]">
                            Renewal payment due
                          </Badge>
                        )}
                        {!item.emailConfirmedAt && (
                          <Badge variant="outline" className="border-[#E83262]/24 bg-[#E83262]/10 text-[#8a641f]">
                            Email confirmation pending
                          </Badge>
                        )}
                        {item.profileReviewStatus && <StatusBadge status={item.profileReviewStatus} />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  copy={
                    searchTerm
                      ? "No Heritage concierge members match this admin search."
                      : "No Heritage members are visible yet. Once granted, they will appear here for concierge follow-up."
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section className={currentSection === "overview" ? "scroll-mt-28" : "hidden"}>
          <Card className="overflow-hidden rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader className="border-b border-[#482b1a]/10 bg-white/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">supabase email watch</p>
                  <CardTitle className="flex items-center gap-3 font-serif text-3xl tracking-[-0.04em] text-[#26364A] sm:text-4xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E83262] text-white">
                      <Mail className="h-5 w-5" />
                    </span>
                    Auth email telemetry
                  </CardTitle>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6F7C8B]">
                    Tracks Supabase Auth audit events with separate lifetime and last-30-day counters for emails and
                    clickable magic links, including confirmation and reset-password links.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={overview?.authEmailTelemetry.status || "pending"} />
                  <Badge variant="outline" className="rounded-full border-[#E83262]/30 bg-[#ffffff] px-4 py-2 text-[#E83262]">
                    {authEmailOverall.toLocaleString("en-IN")} emails all time
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-[#E83262]/30 bg-[#ffffff] px-4 py-2 text-[#E83262]">
                    {authEmailLast30.toLocaleString("en-IN")} emails in 30d
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              {overview?.authEmailTelemetry.detail && (
                <div className="rounded-[1.35rem] border border-[#E83262]/20 bg-[#E83262]/10 p-4 text-sm font-semibold leading-6 text-[#8a641f]">
                  {overview.authEmailTelemetry.detail}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {overview?.authEmailTelemetry.summary.length ? (
                  overview.authEmailTelemetry.summary.map((item) => (
                    <div key={item.category} className="rounded-[1.6rem] border border-[#482b1a]/10 bg-white/72 p-5 shadow-[0_18px_48px_rgba(24,17,13,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E83262]">{item.label}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[1.2rem] border border-[#E83262]/24 bg-[#ffffff] p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#9d7a55]">All time</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.overall.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-[#E83262]/14 bg-[#E83262]/6 p-4">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#E83262]">Last 30 days</p>
                          <p className="mt-2 font-serif text-4xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 min-h-12 text-xs leading-5 text-[#6F7C8B]">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">Last seen {formatDate(item.lastSeen)}</p>
                    </div>
                  ))
                ) : (
                  <div className="lg:col-span-2">
                    <EmptyState copy="No Supabase auth email counters are available yet." />
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {overview?.authEmailTelemetry.counts.length ? (
                  overview.authEmailTelemetry.counts.map((item) => (
                    <div key={item.action} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/58 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E83262]">{item.label}</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">All time</p>
                          <p className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#26364A]">
                            {item.total.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[#9d7a55]">30d</p>
                          <p className="font-serif text-2xl font-bold tracking-[-0.05em] text-[#E83262]">
                            {item.last30Days.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 min-h-12 text-xs leading-5 text-[#6F7C8B]">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-[#9d7a55]">Last seen {formatDate(item.lastSeen)}</p>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 xl:col-span-5">
                    <EmptyState copy="No detailed Supabase auth email actions found yet." />
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[#482b1a]/10 bg-[#ffffff]/70">
                <div className="flex flex-col gap-2 border-b border-[#482b1a]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">Recent email events</p>
                    <p className="text-xs font-semibold text-[#9d7a55]">
                      Since {formatDate(overview?.authEmailTelemetry.since)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[#6F7C8B]">
                    Source: Supabase `auth.audit_log_entries`
                  </p>
                </div>
                <div className="divide-y divide-[#482b1a]/10">
                  {overview?.authEmailTelemetry.events.length ? (
                    overview.authEmailTelemetry.events.map((event) => (
                      <div key={event.id} className="grid gap-3 p-4 text-sm sm:grid-cols-[1.1fr_1fr_0.9fr] sm:items-center">
                        <div>
                          <p className="font-bold text-[#26364A]">{event.label}</p>
                          <p className="mt-1 text-xs text-[#6F7C8B]">{event.action}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#26364A]">{event.email || "Email not exposed in audit payload"}</p>
                          <p className="mt-1 text-xs text-[#6F7C8B]">Auth audit event</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-[#26364A]">{formatDate(event.createdAt)}</p>
                          <p className="mt-1 text-xs text-[#6F7C8B]">{event.ipAddress || "IP unavailable"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4">
                      <EmptyState copy="No recent email event rows are available yet." />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="profiles" className={currentSection === "profiles" ? "grid scroll-mt-28 gap-5 xl:grid-cols-[1.05fr_0.95fr]" : "hidden"}>
          <Card className="rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">member quality</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">
                    Profile review
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.profiles.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.profiles.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.profiles.detail}
                </p>
              )}
              {filteredProfiles.length ? (
                filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenProfile(profile)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleOpenProfile(profile)
                      }
                    }}
                    className="cursor-pointer rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:border-[#E83262]/35 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">{profile.name}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#9d7a55]">
                          ID - {profile.publicId || "Pending"}
                        </p>
                        <p className="mt-1 text-sm text-[#6F7C8B]">
                          {[profile.age ? `${profile.age} yrs` : null, profile.gender, profile.city].filter(Boolean).join(" - ") ||
                            "Profile details pending"}
                        </p>
                        {profile.email && <p className="mt-1 text-xs font-semibold text-[#9d7a55]">{profile.email}</p>}
                        {profile.phone && <p className="mt-1 text-xs font-semibold text-[#9d7a55]">{profile.phone}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={profile.reviewStatus} />
                        <StatusBadge status={profile.profileCompleted ? "active" : "pending"} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-[#6F7C8B] sm:grid-cols-3">
                      <span>{profile.completionSteps}/7 steps complete</span>
                      <span>{profile.photoCount} photos</span>
                      <span>{profile.createdBy ? `Created by ${profile.createdBy}` : "Creator pending"}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#6F7C8B]">
                      {[profile.education, profile.jobTitle].filter(Boolean).join(" - ") || "Career and education pending"}
                    </p>
                    {profile.bio && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6F7C8B]">{profile.bio}</p>}
                    {profile.flags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.flags.map((flag) => (
                          <Badge key={flag} variant="outline" className="border-[#E83262]/24 bg-[#E83262]/10 text-[#8a641f]">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {profile.reviewNotes && (
                      <p className="mt-3 rounded-2xl border border-[#482b1a]/10 bg-white/60 p-3 text-xs leading-5 text-[#6F7C8B]">
                        Admin note: {profile.reviewNotes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[#9d7a55]">
                      Updated {formatDate(profile.updatedAt)}
                      {profile.reviewedAt ? ` | Reviewed ${formatDate(profile.reviewedAt)}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#DDE4EE] bg-white"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenProfile(profile)
                        }}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Detailed info
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleAction("profile", profile.id, "approved")
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#482b1a]/15 bg-white"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleAction("profile", profile.id, "in_review")
                        }}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
                        disabled={Boolean(actionKey) || !profileReviewActionsReady}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleAction("profile", profile.id, "rejected")
                        }}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No profiles match this admin search." : "No matrimony profiles were returned yet."} />
              )}
            </CardContent>
          </Card>

          <Card className="luxe-dark-card rounded-[2rem] border-[#E83262]/24 text-[#ffffff]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">identity queue</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">
                    Verifications
                  </CardTitle>
                </div>
                <StatusBadge status={overview?.queues.verifications.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.verifications.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-white/8 p-3 text-sm font-semibold text-[#E83262]">
                  {overview.queues.verifications.detail}
                </p>
              )}
              {filteredVerifications.length ? (
                filteredVerifications.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/8 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#ffffff]">{item.profileName}</p>
                        <p className="mt-1 text-sm text-[#E83262]">
                          {item.documentType ? statusLabel(item.documentType) : "Document type pending"}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#d9c8a8]">
                      Document: {item.documentFileName || "Not uploaded"} | Face scan: {item.faceScanFileName || "Not uploaded"}
                    </p>
                    <p className="mt-1 text-xs text-[#d9c8a8]">Submitted {formatDate(item.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "approved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#E83262]/40 bg-white/10 text-[#ffffff] hover:bg-white/15"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "in_review")}
                      >
                        <UserRoundCheck className="mr-2 h-4 w-4" />
                        In review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#f3b2b2]/40 bg-[#E83262]/30 text-white hover:bg-[#E83262]/55"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("verification", item.id, "rejected")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No verifications match this admin search." : "No pending identity verifications right now."} />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="safety" className={currentSection === "safety" ? "grid scroll-mt-28 gap-5 lg:grid-cols-[0.95fr_1.05fr]" : currentSection === "audit" ? "scroll-mt-28" : "hidden"}>
          <Card className={currentSection === "safety" ? "rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="luxe-kicker mb-2 text-[#E83262]">trust desk</p>
                  <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Safety reports</CardTitle>
                </div>
                <StatusBadge status={overview?.queues.reports.status || "pending"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.queues.reports.detail && (
                <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                  {overview.queues.reports.detail}
                </p>
              )}
              {filteredReports.length ? (
                filteredReports.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-bold tracking-[-0.04em] text-[#26364A]">
                          {item.reportedName}
                        </p>
                        <p className="mt-1 text-sm text-[#6F7C8B]">Reported by {item.reporterName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#E83262]">{statusLabel(item.reason)}</p>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#6F7C8B]">
                      {item.description || "No extra description was provided."}
                    </p>
                    <p className="mt-2 text-xs text-[#9d7a55]">Submitted {formatDate(item.createdAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "resolved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#482b1a]/15 bg-white"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "reviewed")}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#E83262]/20 bg-[#E83262]/10 text-[#E83262]"
                        disabled={Boolean(actionKey)}
                        onClick={() => handleAction("report", item.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState copy={searchTerm ? "No safety reports match this admin search." : "No open safety reports right now."} />
              )}
            </CardContent>
          </Card>

          <div className={currentSection === "audit" ? "" : "space-y-5"}>
            <Card className={currentSection === "safety" ? "rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Launch readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(overview?.readiness || []).map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-2xl border border-[#482b1a]/10 bg-white/58 p-4">
                    {item.status === "ok" ? (
                      <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                    ) : (
                      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                    )}
                    <div>
                      <p className="font-bold text-[#26364A]">{item.label}</p>
                      <p className="text-sm leading-6 text-[#6F7C8B]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card id="audit" className={currentSection === "audit" ? "scroll-mt-28 rounded-[1.5rem] border-[#DDE4EE] bg-white shadow-[0_18px_52px_rgba(38,54,74,0.07)]" : "hidden"}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="luxe-kicker mb-2 text-[#E83262]">audit trail</p>
                    <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#26364A]">Action history</CardTitle>
                  </div>
                  <StatusBadge status={overview?.queues.audit.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview?.queues.audit.detail && (
                  <p className="rounded-2xl border border-[#E83262]/20 bg-[#E83262]/10 p-3 text-sm font-semibold text-[#8a641f]">
                    {overview.queues.audit.detail}
                  </p>
                )}
                {filteredAudit.length ? (
                  filteredAudit.map((item) => (
                    <div key={item.id} className="rounded-[1.35rem] border border-[#482b1a]/10 bg-white/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#26364A]">{statusLabel(item.action)}</p>
                          <p className="mt-1 text-sm text-[#6F7C8B]">
                            {item.actorEmail || "Admin"} updated {item.resource}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-[#9d7a55]">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.previousStatus && <StatusBadge status={item.previousStatus} />}
                        <span className="text-sm font-bold text-[#9d7a55]">to</span>
                        {item.nextStatus && <StatusBadge status={item.nextStatus} />}
                      </div>
                      {item.notes && <p className="mt-3 text-sm leading-6 text-[#6F7C8B]">{item.notes}</p>}
                    </div>
                  ))
                ) : (
                  <EmptyState copy={searchTerm ? "No audit records match this admin search." : "No admin actions have been recorded yet."} />
                )}
              </CardContent>
            </Card>

            <Card className={currentSection === "safety" ? "luxe-dark-card rounded-[2rem] border-[#E83262]/24 text-[#ffffff]" : "hidden"}>
              <CardHeader>
                <CardTitle className="font-serif text-3xl tracking-[-0.04em] text-[#ffffff]">Admin safety model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-7 text-[#E83262]">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <Activity className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                  <p>
                    This portal can update user access, profile review, verification, reports, and events only after Supabase login and ADMIN_EMAILS allowlist checks.
                  </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#E83262]" />
                  <p>
                    Payment-provider changes, refunds, bulk edits, OTP delivery, and webhook automation stay outside this
                    phase until those workflows get separate role gates and stronger confirmations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
          </div>
        </div>
      </div>
      {selectedProfile && profileEditDraft && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#172235]/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-5">
          <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-[#DDE4EE] bg-white shadow-[0_32px_120px_rgba(23,34,53,0.28)]">
            <div className="flex flex-col gap-4 border-b border-[#E1E7EF] bg-[#F7F9FC] p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="luxe-kicker mb-2 text-[#E83262]">profile dossier</p>
                <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#172235] sm:text-4xl">
                  {selectedProfile.name}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={selectedProfile.reviewStatus} />
                  <StatusBadge status={selectedProfile.profileCompleted ? "complete" : "draft"} />
                  {selectedProfile.profileHidden && <StatusBadge status="hidden" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-full bg-[#172235] text-white hover:bg-[#26364A]"
                  disabled={profileSaving}
                  onClick={() => void saveProfileEditDraft()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {profileSaving ? "Saving..." : "Save profile"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-[#DDE4EE] bg-white"
                  onClick={() => {
                    setSelectedProfile(null)
                    setProfileEditDraft(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[0.36fr_0.64fr]">
              <aside className="border-b border-[#E1E7EF] bg-white p-5 lg:border-b-0 lg:border-r">
                <div className="grid gap-3">
                  <div className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Identifiers</p>
                    <div className="mt-3 space-y-2 text-sm font-semibold text-[#26364A]">
                      <p>Public ID: {selectedProfile.publicId || "Pending"}</p>
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Contact</p>
                    <div className="mt-3 space-y-2 text-sm font-semibold text-[#26364A]">
                      <p className="break-all">{selectedProfile.email || "Email unavailable"}</p>
                      <p>{selectedProfile.phone || "Phone not provided"}</p>
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[#E1E7EF] bg-[#F7F9FC] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8B98A8]">Snapshot</p>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-[#6F7C8B]">
                      <span>{selectedProfile.age ? `${selectedProfile.age} yrs` : "Age pending"}</span>
                      <span>{selectedProfile.gender || "Gender pending"}</span>
                      <span>{selectedProfile.city || "Location pending"}</span>
                      <span>{selectedProfile.education || "Education pending"}</span>
                      <span>{selectedProfile.jobTitle || "Career pending"}</span>
                      <span>{selectedProfile.photoCount} photos</span>
                    </div>
                  </div>
                  {selectedProfile.flags.length > 0 && (
                    <div className="rounded-[1.25rem] border border-[#E83262]/20 bg-[#FFF4F7] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C3264E]">Flags</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedProfile.flags.map((flag) => (
                          <Badge key={flag} variant="outline" className="border-[#E83262]/24 bg-white text-[#C3264E]">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full bg-[#1b6b43] text-white hover:bg-[#155333]" onClick={() => handleAction("profile", selectedProfile.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full border-[#DDE4EE] bg-white" onClick={() => handleAction("profile", selectedProfile.id, "in_review")}>
                      In review
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full border-[#E83262]/20 bg-[#FFF4F7] text-[#C3264E]" onClick={() => handleAction("profile", selectedProfile.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              </aside>

              <div className="space-y-5 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-name">Name</Label>
                    <Input id="profile-edit-name" value={profileEditDraft.name} onChange={(event) => updateProfileEditDraft("name", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-age">Age</Label>
                    <Input id="profile-edit-age" type="number" min="18" max="100" value={profileEditDraft.age} onChange={(event) => updateProfileEditDraft("age", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-gender">Gender</Label>
                    <Input id="profile-edit-gender" value={profileEditDraft.gender} onChange={(event) => updateProfileEditDraft("gender", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-created-by">Created by</Label>
                    <Input id="profile-edit-created-by" value={profileEditDraft.createdBy} onChange={(event) => updateProfileEditDraft("createdBy", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-public-id">Public profile ID</Label>
                    <Input id="profile-edit-public-id" value={profileEditDraft.publicId} onChange={(event) => updateProfileEditDraft("publicId", event.target.value)} className="rounded-2xl bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-phone">Phone</Label>
                    <Input id="profile-edit-phone" value={profileEditDraft.phone} onChange={(event) => updateProfileEditDraft("phone", event.target.value)} className="rounded-2xl bg-white" placeholder="+91..." />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => updateProfileEditDraft("profileCompleted", !profileEditDraft.profileCompleted)}
                    className={profileEditDraft.profileCompleted ? "rounded-2xl border border-[#1b6b43]/20 bg-[#1b6b43]/10 p-4 text-left text-sm font-bold text-[#1b6b43]" : "rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-4 text-left text-sm font-bold text-[#C3264E]"}
                  >
                    {profileEditDraft.profileCompleted ? "Profile complete" : "Profile draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProfileEditDraft("profileHidden", !profileEditDraft.profileHidden)}
                    className={profileEditDraft.profileHidden ? "rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-4 text-left text-sm font-bold text-[#C3264E]" : "rounded-2xl border border-[#1b6b43]/20 bg-[#1b6b43]/10 p-4 text-left text-sm font-bold text-[#1b6b43]"}
                  >
                    {profileEditDraft.profileHidden ? "Hidden from discovery" : "Visible in discovery"}
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="profile-edit-review">Review status</Label>
                    <select
                      id="profile-edit-review"
                      value={profileEditDraft.reviewStatus}
                      onChange={(event) => updateProfileEditDraft("reviewStatus", event.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#DDE4EE] bg-white px-4 text-sm font-semibold text-[#26364A]"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_review">In review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-edit-bio">Bio</Label>
                  <Textarea id="profile-edit-bio" value={profileEditDraft.bio} onChange={(event) => updateProfileEditDraft("bio", event.target.value)} className="min-h-28 rounded-2xl bg-white" />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {[
                    ["Photos JSON", "photosJson"],
                    ["Personal JSON", "personalJson"],
                    ["Career JSON", "careerJson"],
                    ["Family JSON", "familyJson"],
                    ["Cultural JSON", "culturalJson"],
                    ["Partner preferences JSON", "partnerPreferencesJson"],
                  ].map(([label, key]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`profile-edit-${key}`}>{label}</Label>
                      <Textarea
                        id={`profile-edit-${key}`}
                        value={String(profileEditDraft[key as keyof AdminProfileEditDraft] || "")}
                        onChange={(event) => updateProfileEditDraft(key as keyof AdminProfileEditDraft, event.target.value as never)}
                        className="min-h-44 rounded-2xl bg-[#0f172a] font-mono text-xs text-white"
                        spellCheck={false}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-edit-notes">Audit note</Label>
                  <Textarea id="profile-edit-notes" value={profileEditDraft.notes} onChange={(event) => updateProfileEditDraft("notes", event.target.value)} className="min-h-24 rounded-2xl bg-white" />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172235]/55 px-4 py-5 backdrop-blur-sm sm:items-center">
          <section className="w-full max-w-xl rounded-[1.5rem] border border-[#DDE4EE] bg-white p-5 shadow-[0_32px_120px_rgba(23,34,53,0.28)] sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={
                  pendingAction.destructive
                    ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4F7] text-[#C3264E]"
                    : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F1F8F4] text-[#1b6b43]"
                }
              >
                {pendingAction.destructive ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="luxe-kicker mb-2 text-[#E83262]">admin review</p>
                <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#172235]">
                  {pendingAction.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">{pendingAction.detail}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="admin-action-note">Audit note</Label>
              <Textarea
                id="admin-action-note"
                value={pendingActionNote}
                onChange={(event) => setPendingActionNote(event.target.value)}
                className="min-h-28"
                placeholder="Add the reason or operator note for this decision."
              />
            </div>

            {error && (
              <p className="mt-4 rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-3 text-sm font-bold text-[#C3264E]">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#DDE4EE] bg-white"
                disabled={Boolean(actionKey)}
                onClick={() => {
                  setPendingAction(null)
                  setPendingActionNote("")
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={pendingAction.destructive ? "rounded-full bg-[#C3264E] text-white hover:bg-[#9f1f40]" : "luxe-button rounded-full"}
                disabled={Boolean(actionKey)}
                onClick={() => void submitPendingAction()}
              >
                {actionKey ? "Saving..." : "Confirm action"}
              </Button>
            </div>
          </section>
        </div>
      )}
      {pendingEventDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172235]/55 px-4 py-5 backdrop-blur-sm sm:items-center">
          <section className="w-full max-w-lg rounded-[1.5rem] border border-[#DDE4EE] bg-white p-5 shadow-[0_32px_120px_rgba(23,34,53,0.28)] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4F7] text-[#C3264E]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="luxe-kicker mb-2 text-[#E83262]">delete event</p>
                <h2 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[#172235]">
                  Delete {pendingEventDelete.title}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6F7C8B]">
                  This removes the event from the admin calendar and public event listings. Use archive when the event should stay in history.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl border border-[#E83262]/20 bg-[#FFF4F7] p-3 text-sm font-bold text-[#C3264E]">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#DDE4EE] bg-white"
                disabled={eventSaving}
                onClick={() => setPendingEventDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#C3264E] text-white hover:bg-[#9f1f40]"
                disabled={eventSaving}
                onClick={() => void confirmDeleteEvent()}
              >
                {eventSaving ? "Deleting..." : "Delete event"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
