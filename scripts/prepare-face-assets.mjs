import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const config = JSON.parse(readFileSync(path.join(root, "lib/face-detection-assets.json"), "utf8"))
const source = path.join(root, "node_modules/@mediapipe/face_detection")
const installed = JSON.parse(readFileSync(path.join(source, "package.json"), "utf8"))
if (installed.version !== config.version) throw new Error("MediaPipe asset version does not match the pinned scanner version")
const destination = path.join(root, "public/vendor/face-detection", config.version)
mkdirSync(destination, { recursive: true })
for (const file of config.files) {
  if (path.basename(file) !== file) throw new Error("Invalid face model asset name")
  copyFileSync(path.join(source, file), path.join(destination, file))
}
copyFileSync(path.join(root, "licenses/Apache-2.0.txt"), path.join(destination, "LICENSE.txt"))
writeFileSync(path.join(destination, "NOTICE.txt"),
  `MediaPipe Face Detection ${config.version}\nCopyright Google LLC and The Closure Library Authors. Apache-2.0.\nhttps://github.com/google-ai-edge/mediapipe\nhttps://www.apache.org/licenses/LICENSE-2.0\n`)
console.log(`Prepared ${config.files.length} pinned face model assets at /vendor/face-detection/${config.version}`)
