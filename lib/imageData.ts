/** Decode a canvas image locally; fetch(data:...) would be blocked by the app's connect-src policy. */
export function imageDataUrlToBlob(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) throw new Error("Invalid captured image")
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: match[1] })
}
