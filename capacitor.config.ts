import type { CapacitorConfig } from "@capacitor/cli"

const hostedAppUrl = process.env.CAPACITOR_SERVER_URL || "https://lovesathi.com"

const config: CapacitorConfig = {
  appId: "com.lovesathi.app",
  appName: "Lovesathi",
  webDir: "native-shell",
  server: {
    url: hostedAppUrl,
    cleartext: false,
    androidScheme: "https",
    iosScheme: "lovesathi",
    allowNavigation: ["lovesathi.com", "*.lovesathi.com", "*.supabase.co"],
  },
}

export default config
