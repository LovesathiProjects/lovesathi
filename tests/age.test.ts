import assert from "node:assert/strict"
import { test } from "node:test"
import * as web from "../lib/age"
import * as mobile from "../mobile/src/lib/age"

for (const [name, dates] of [["web", web], ["mobile", mobile]] as const) {
  test(`${name}: birthday and 18-year cutoff agree across time zones`, () => {
    const original = process.env.TZ
    try {
      for (const tz of ["UTC", "Asia/Riyadh", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Kiritimati"]) {
        process.env.TZ = tz
        const today = new Date(2026, 10, 14, 0, 5)
        assert.equal(dates.getMinimumBirthDate(18, today), "2008-11-14", tz)
        assert.equal(dates.calculateAgeFromDate("2008-11-14", today), 18, tz)
        assert.equal(dates.calculateAgeFromDate("2008-11-15", today), 17, tz)
        assert.match(dates.formatDateForDisplay("2008-11-14")!, /^14 Nov 2008$/, tz)
      }
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })

  test(`${name}: rejects malformed, impossible and future dates`, () => {
    const today = new Date(2026, 10, 14)
    for (const invalid of ["", "invalid", "2008-02-30", "2007-02-29", "2008-13-01", "2008-00-10", "2008-1-1", "2008-11-14T00:00:00Z"]) {
      assert.equal(dates.calculateAgeFromDate(invalid, today), null, invalid)
      assert.equal(dates.formatDateForDisplay(invalid), null, invalid)
    }
    assert.equal(dates.calculateAgeFromDate("2027-01-01", today), null)
    assert.equal(dates.calculateAgeFromDate("2008-02-29", today), 18)
  })

  test(`${name}: leap-day cutoff does not allow March 1 births early`, () => {
    const today = new Date(2024, 1, 29)
    assert.equal(dates.getMinimumBirthDate(18, today), "2006-02-28")
    assert.equal(dates.calculateAgeFromDate("2006-03-01", today), 17)
    assert.equal(dates.calculateAgeFromDate("2006-02-28", today), 18)
  })
}
