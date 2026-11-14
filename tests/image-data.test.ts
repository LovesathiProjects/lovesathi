import assert from "node:assert/strict"
import { test } from "node:test"
import { imageDataUrlToBlob } from "../lib/imageData"

test("captured image conversion preserves bytes and MIME type without a network fetch", async () => {
  const blob = imageDataUrlToBlob("data:image/jpeg;base64,/9j/2Q==")
  assert.equal(blob.type, "image/jpeg")
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array([255, 216, 255, 217]))
})

test("capture conversion rejects remote references, non-image data and malformed encoding", () => {
  for (const value of ["https://example.test/selfie.jpg", "data:text/html;base64,PHNjcmlwdD4=", "data:image/jpeg;base64,?", "data:image/jpeg;base64,a"]) {
    assert.throws(() => imageDataUrlToBlob(value), Error, value)
  }
})
