const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lovesathi.com").replace(/\/$/, "")
const secret = process.env.SUBSCRIPTION_MAINTENANCE_SECRET || process.env.CRON_SECRET

if (!secret) {
  console.error("SUBSCRIPTION_MAINTENANCE_SECRET or CRON_SECRET is required.")
  process.exit(1)
}

const response = await fetch(`${siteUrl}/api/subscriptions/maintenance`, {
  method: "POST",
  headers: {
    "x-cron-secret": secret,
  },
})

const body = await response.text()
console.log(body)

if (!response.ok) {
  process.exit(1)
}

