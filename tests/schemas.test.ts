import assert from "node:assert/strict"
import { test } from "node:test"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import type { FieldErrors } from "react-hook-form"
import { bioSchema, welcomeIdentitySchema } from "../lib/schemas/matrimony"

test("onboarding accepts a valid member after the Zod/resolver upgrade", async () => {
  const data = { name: "Test Member", age: 25, gender: "Female", createdBy: "Self" } as const
  const result = await zodResolver(welcomeIdentitySchema)(data, {}, {
    fields: {}, shouldUseNativeValidation: false,
  })
  assert.deepEqual(result.errors, {})
  assert.deepEqual(result.values, data)
})

test("onboarding exposes field errors for invalid age and missing selections", async () => {
  type Values = z.infer<typeof welcomeIdentitySchema>
  const input = { name: "A", age: NaN } as Values
  const result = await zodResolver(welcomeIdentitySchema)(input, {}, {
    fields: {}, shouldUseNativeValidation: false,
  })
  const errors = result.errors as FieldErrors<Values>
  assert.equal(errors.age?.message, "Enter a valid age")
  assert.equal(errors.gender?.message, "Select gender")
  assert.equal(errors.createdBy?.message, "Select who created the profile")
})

test("bio still enforces its 20 to 300 character limits", () => {
  assert.equal(bioSchema.safeParse({ bio: "a".repeat(19) }).success, false)
  assert.equal(bioSchema.safeParse({ bio: "a".repeat(20) }).success, true)
  assert.equal(bioSchema.safeParse({ bio: "a".repeat(300) }).success, true)
  assert.equal(bioSchema.safeParse({ bio: "a".repeat(301) }).success, false)
})
