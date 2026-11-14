// Creates a fresh local PostgreSQL cluster. Does not read Supabase credentials or connect to a project.
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const temp = mkdtempSync(path.join(tmpdir(), "lovesathi-security-test-"))
const data = path.join(temp, "data")
const log = path.join(temp, "server.log")
let started = false
try {
  execFileSync("initdb", ["-D", data, "-U", "postgres", "--auth-local=trust", "--auth-host=reject", "--no-locale"], { stdio: "pipe" })
  // Unix socket only, inside the new private temp directory; no TCP listener.
  execFileSync("pg_ctl", ["-D", data, "-l", log, "-o", `-k '${temp}' -p 55439 -h ''`, "start"], { stdio: "pipe" })
  started = true
  execFileSync("psql", [
    "-h", temp, "-p", "55439", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
    "-f", path.join(root, "tests/database/fixture.sql"),
    "-f", path.join(root, "supabase/migrations/20261114145023_harden_member_data_access.sql"),
    "-f", path.join(root, "supabase/migrations/20261114145101_enforce_member_data_boundaries.sql"),
    "-f", path.join(root, "tests/database/member-access.sql"),
  ], { stdio: "inherit" })
  console.log("Isolated database security checks passed.")
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (started) execFileSync("pg_ctl", ["-D", data, "-m", "fast", "stop"], { stdio: "pipe" })
  rmSync(temp, { recursive: true, force: true })
}
