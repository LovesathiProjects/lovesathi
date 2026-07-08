"use client"

import { FormEvent, useState } from "react"
import { CheckCircle2, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type EventRegistrationFormProps = {
  eventId: string
  eventTitle: string
  featured?: boolean
}

export function EventRegistrationForm({ eventId, eventTitle, featured = false }: EventRegistrationFormProps) {
  const [open, setOpen] = useState(false)
  const [attendeeName, setAttendeeName] = useState("")
  const [attendeeEmail, setAttendeeEmail] = useState("")
  const [attendeePhone, setAttendeePhone] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/events/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          notes,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Unable to register for this event.")
      }

      setMessage(`Registration received for ${eventTitle}.`)
      setAttendeeName("")
      setAttendeeEmail("")
      setAttendeePhone("")
      setNotes("")
      setOpen(false)
    } catch (err: any) {
      setError(err.message || "Unable to register for this event.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          className={featured ? "rounded-md bg-white text-[#26364A] hover:bg-white/90" : "luxe-button rounded-md"}
          onClick={() => setOpen(true)}
        >
          <Ticket className="h-4 w-4" />
          Register
        </Button>
        {message && (
          <p className={featured ? "text-sm font-semibold text-white/76" : "text-sm font-semibold text-[#1b6b43]"}>
            {message}
          </p>
        )}
        {error && (
          <p className={featured ? "text-sm font-semibold text-[#F7C9D5]" : "text-sm font-semibold text-[#C3264E]"}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        featured
          ? "mt-4 space-y-3 rounded-lg border border-white/14 bg-white/10 p-4"
          : "mt-4 space-y-3 rounded-lg border border-[#E6EAF1] bg-[#F8FAFD] p-4"
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={attendeeName}
          onChange={(event) => setAttendeeName(event.target.value)}
          placeholder="Full name"
          required
          className={featured ? "border-white/20 bg-white text-[#26364A]" : ""}
        />
        <Input
          value={attendeePhone}
          onChange={(event) => setAttendeePhone(event.target.value)}
          placeholder="Phone or WhatsApp"
          className={featured ? "border-white/20 bg-white text-[#26364A]" : ""}
        />
      </div>
      <Input
        type="email"
        value={attendeeEmail}
        onChange={(event) => setAttendeeEmail(event.target.value)}
        placeholder="Email"
        className={featured ? "border-white/20 bg-white text-[#26364A]" : ""}
      />
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional note"
        className={featured ? "min-h-24 border-white/20 bg-white text-[#26364A]" : "min-h-24"}
      />
      {error && (
        <p className={featured ? "text-sm font-semibold text-[#F7C9D5]" : "text-sm font-semibold text-[#C3264E]"}>
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className={featured ? "rounded-md bg-white text-[#26364A] hover:bg-white/90" : "luxe-button rounded-md"} disabled={saving}>
          <CheckCircle2 className="h-4 w-4" />
          {saving ? "Registering..." : "Submit registration"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={featured ? "rounded-md border-white/20 bg-white/10 text-white hover:bg-white/15" : "rounded-md border-[#482b1a]/15 bg-white"}
          disabled={saving}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
