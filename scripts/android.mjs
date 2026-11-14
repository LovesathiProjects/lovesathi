import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const windows = process.platform === "win32"
const executable = (name) => `${name}${windows ? ".exe" : ""}`
const tasks = {
  debug: ":app:assembleDebug",
  release: ":app:assembleRelease",
  bundle: ":app:bundleRelease",
  unit: ":app:testDebugUnitTest",
  connected: ":app:connectedDebugAndroidTest",
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal})`)
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed`)
  return `${result.stdout || ""}${result.stderr || ""}`
}

function resolveSdk() {
  const propertiesFile = path.join(root, "android", "local.properties")
  const configured = existsSync(propertiesFile)
    ? readFileSync(propertiesFile, "utf8").match(/^\s*sdk\.dir\s*=\s*(.+)\s*$/m)?.[1]?.trim().replace(/\\([\\: ])/g, "$1")
    : undefined
  const candidates = [
    configured,
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.platform === "darwin" ? path.join(homedir(), "Library", "Android", "sdk") : undefined,
    windows && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : undefined,
    path.join(homedir(), "Android", "Sdk"),
  ]
  return candidates.filter(Boolean).find((candidate) =>
    existsSync(path.join(candidate, "platforms", "android-36", "android.jar")) &&
    existsSync(path.join(candidate, "platform-tools", executable("adb"))),
  )
}

function gradle(task) {
  run(windows ? "gradlew.bat" : "sh", windows ? [task, "--console=plain"] : ["./gradlew", task, "--console=plain"], {
    cwd: path.join(root, "android"),
    shell: windows,
  })
}

function syncAndroid() {
  run(process.execPath, [path.join(root, "node_modules", "@capacitor", "cli", "bin", "capacitor"), "sync", "android"])
}

try {
  const [action = "doctor", ...args] = process.argv.slice(2)
  if (!["doctor", "install", ...Object.keys(tasks)].includes(action)) throw new Error("Unknown Android action")

  const problems = []
  const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", executable("java")) : "java"
  try {
    const version = capture(java, ["-version"]).match(/version "(\d+)/)?.[1]
    if (!version || Number(version) < 21) problems.push("JDK 21 or newer is required by Capacitor 8. Set JAVA_HOME to that JDK.")
    else console.log(`JDK: ${version}`)
  } catch {
    problems.push("Java was not found. Install JDK 21 or newer and set JAVA_HOME.")
  }

  const sdk = resolveSdk()
  if (!sdk) problems.push("Android SDK Platform 36 and platform-tools are required. Set ANDROID_HOME or android/local.properties.")
  if (problems.length) throw new Error(problems.join("\n"))
  process.env.ANDROID_HOME = sdk
  process.env.ANDROID_SDK_ROOT = sdk
  const adb = path.join(sdk, "platform-tools", executable("adb"))

  if (action === "doctor") {
    console.log(`Android SDK: ${sdk}`)
    console.log(`Release signing: ${existsSync(path.join(root, "android", "key.properties")) ? "key.properties present; Gradle validates it at release build" : "not configured"}`)
    run(adb, ["devices", "-l"])
  } else if (action === "install" || action === "connected") {
    const devices = capture(adb, ["devices"]).split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^(\S+)\s+device$/)
      return match ? [match[1]] : []
    })
    const serial = args[0] || process.env.ANDROID_SERIAL || (devices.length === 1 ? devices[0] : null)
    if (!serial || !devices.includes(serial)) throw new Error("Select one ready device: pass its adb serial after --, or set ANDROID_SERIAL.")
    process.env.ANDROID_SERIAL = serial
    syncAndroid()
    if (action === "connected") gradle(tasks.connected)
    else {
      // Always rebuild so installation cannot silently use a stale APK.
      gradle(tasks.debug)
      run(adb, ["-s", serial, "install", "-r", path.join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")])
      run(adb, ["-s", serial, "shell", "am", "start", "-n", "com.lovesathi.app/.MainActivity"])
    }
  } else {
    syncAndroid()
    gradle(tasks[action])
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
