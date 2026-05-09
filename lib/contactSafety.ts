const CONTACT_DIGIT_THRESHOLD = 4
const RECENT_CONTEXT_LIMIT = 12

export const CONTACT_SHARING_BLOCKED_MESSAGE =
  "For safety, phone numbers cannot be shared in chat. Use premium contact reveal instead."

const UNICODE_ZERO_CODE_POINTS = [
  0x0660,
  0x06f0,
  0x0966,
  0x09e6,
  0x0a66,
  0x0ae6,
  0x0b66,
  0x0be6,
  0x0c66,
  0x0ce6,
  0x0d66,
  0x0e50,
  0x0ed0,
  0x1040,
  0x17e0,
  0xff10,
]

const DIGIT_WORDS: Record<string, string> = {
  "0": "0",
  zero: "0",
  oh: "0",
  o: "0",
  nil: "0",
  nought: "0",
  shunya: "0",
  sunya: "0",
  sifr: "0",
  poojyam: "0",
  sunnah: "0",
  one: "1",
  won: "1",
  ek: "1",
  aik: "1",
  ondru: "1",
  okati: "1",
  ondu: "1",
  two: "2",
  too: "2",
  do: "2",
  dou: "2",
  rendu: "2",
  eradu: "2",
  irandu: "2",
  three: "3",
  tree: "3",
  teen: "3",
  tin: "3",
  moonu: "3",
  mudu: "3",
  mooru: "3",
  four: "4",
  fore: "4",
  char: "4",
  chaar: "4",
  naalu: "4",
  nalku: "4",
  five: "5",
  paanch: "5",
  panch: "5",
  aindhu: "5",
  aidu: "5",
  six: "6",
  che: "6",
  chhe: "6",
  chhah: "6",
  aaru: "6",
  seven: "7",
  saat: "7",
  sat: "7",
  elu: "7",
  eight: "8",
  aath: "8",
  ath: "8",
  ettu: "8",
  enimidi: "8",
  nine: "9",
  nain: "9",
  nau: "9",
  onpathu: "9",
  tommidi: "9",
}

const MULTIPLIERS: Record<string, number> = {
  double: 2,
  twice: 2,
  dbl: 2,
  triple: 3,
  thrice: 3,
}

function unicodeDigitToAscii(char: string) {
  const codePoint = char.codePointAt(0)
  if (codePoint === undefined) return null

  if (codePoint >= 48 && codePoint <= 57) {
    return String(codePoint - 48)
  }

  for (const zero of UNICODE_ZERO_CODE_POINTS) {
    if (codePoint >= zero && codePoint <= zero + 9) {
      return String(codePoint - zero)
    }
  }

  return null
}

function normalizeForContactDetection(content: string) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "")
    .replace(/[|!]/g, "1")
    .replace(/[$]/g, "5")
    .replace(/[@]/g, "0")
}

function tokenizeForContactDetection(content: string) {
  const normalized = normalizeForContactDetection(content)

  let expanded = ""
  for (const char of Array.from(normalized)) {
    const digit = unicodeDigitToAscii(char)
    expanded += digit === null ? char : ` ${digit} `
  }

  return expanded.match(/[\p{L}\p{N}]+/gu) || []
}

function compactSingleLetterRuns(tokens: string[]) {
  const compacted: string[] = []
  let run = ""

  for (const token of tokens) {
    if (/^[a-z]$/.test(token)) {
      run += token
      continue
    }

    if (run.length >= 3) compacted.push(run)
    run = ""
  }

  if (run.length >= 3) compacted.push(run)
  return compacted
}

function extractDigitSignature(content: string) {
  const tokens = tokenizeForContactDetection(content)
  const expandedTokens = [...tokens, ...compactSingleLetterRuns(tokens)]
  let signature = ""
  let pendingMultiplier = 1

  for (const token of expandedTokens) {
    if (MULTIPLIERS[token]) {
      pendingMultiplier = MULTIPLIERS[token]
      continue
    }

    if (/^[0-9]+$/.test(token)) {
      signature += token.repeat(pendingMultiplier)
      pendingMultiplier = 1
      continue
    }

    const digit = DIGIT_WORDS[token]
    if (digit) {
      signature += digit.repeat(pendingMultiplier)
      pendingMultiplier = 1
      continue
    }

    pendingMultiplier = 1
  }

  return signature
}

export function getRecentOutgoingMessageContents(messages: Array<{ sender_id: string; content?: string | null }>, senderId: string) {
  return messages
    .filter((message) => message.sender_id === senderId && message.content)
    .slice(-RECENT_CONTEXT_LIMIT)
    .map((message) => message.content || "")
}

export function containsShareableNumber(content: string, contextMessages: string[] = []) {
  const currentSignature = extractDigitSignature(content)
  if (currentSignature.length >= CONTACT_DIGIT_THRESHOLD) return true

  if (contextMessages.length === 0 || currentSignature.length === 0) return false

  const contextSignature = extractDigitSignature([...contextMessages, content].join(" "))
  return contextSignature.length >= CONTACT_DIGIT_THRESHOLD
}
