const CONTACT_DIGIT_THRESHOLD = 5
const RECENT_CONTEXT_LIMIT = 12

export const CONTACT_SHARING_BLOCKED_MESSAGE =
  "For safety, phone numbers cannot be shared in chat. Use premium contact reveal instead."

const UNICODE_ZERO_CODE_POINTS = [
  0x0660, // Arabic-Indic
  0x06f0, // Eastern Arabic-Indic
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Odia
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
  0x0e50, // Thai
  0x0ed0, // Lao
  0x1040, // Myanmar
  0x17e0, // Khmer
  0xff10, // Fullwidth
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
  صفر: "0",
  शून्य: "0",
  শুন্য: "0",
  শূন্য: "0",
  பூஜ்யம்: "0",
  సున్నా: "0",
  ಸೊನ್ನೆ: "0",
  പൂജ്യം: "0",
  one: "1",
  ek: "1",
  aik: "1",
  एक: "1",
  ایک: "1",
  واحد: "1",
  एक्क: "1",
  এক: "1",
  ஒன்று: "1",
  ఒకటి: "1",
  ಒಂದು: "1",
  ഒന്ന്: "1",
  two: "2",
  dou: "2",
  दोन: "2",
  दो: "2",
  دو: "2",
  اثنين: "2",
  اثنان: "2",
  اثنتين: "2",
  দুই: "2",
  இரண்டு: "2",
  రెండు: "2",
  ಎರಡು: "2",
  രണ്ട്: "2",
  three: "3",
  teen: "3",
  tin: "3",
  तीन: "3",
  تین: "3",
  ثلاثة: "3",
  ثلاثه: "3",
  তিন: "3",
  மூன்று: "3",
  మూడు: "3",
  ಮೂರು: "3",
  മൂന്ന്: "3",
  four: "4",
  char: "4",
  chaar: "4",
  चार: "4",
  چار: "4",
  اربعة: "4",
  أربعة: "4",
  اربع: "4",
  চার: "4",
  நான்கு: "4",
  నాలుగు: "4",
  ನಾಲ್ಕು: "4",
  നാല്: "4",
  five: "5",
  paanch: "5",
  panch: "5",
  पांच: "5",
  पाँच: "5",
  پانچ: "5",
  خمسة: "5",
  خمسه: "5",
  পাঁচ: "5",
  ஐந்து: "5",
  ఐదు: "5",
  ಐದು: "5",
  അഞ്ച്: "5",
  six: "6",
  che: "6",
  chhe: "6",
  छे: "6",
  छह: "6",
  چھ: "6",
  ستة: "6",
  سته: "6",
  ست: "6",
  ছয়: "6",
  ஆறு: "6",
  ఆరు: "6",
  ಆರು: "6",
  ആറ്: "6",
  seven: "7",
  saat: "7",
  sat: "7",
  सात: "7",
  سات: "7",
  سبعة: "7",
  سبعه: "7",
  সাত: "7",
  ஏழு: "7",
  ఏడు: "7",
  ಏಳು: "7",
  ഏഴ്: "7",
  eight: "8",
  aath: "8",
  ath: "8",
  आठ: "8",
  آٹھ: "8",
  ثمانية: "8",
  ثمانيه: "8",
  আট: "8",
  எட்டு: "8",
  ఎనిమిది: "8",
  ಎಂಟು: "8",
  എട്ട്: "8",
  nine: "9",
  nain: "9",
  nau: "9",
  नौ: "9",
  نو: "9",
  تسعة: "9",
  تسعه: "9",
  নয়: "9",
  ஒன்பது: "9",
  తొమ్మిది: "9",
  ಒಂಬತ್ತು: "9",
  ഒൻപത്: "9",
}

const MULTIPLIERS: Record<string, number> = {
  double: 2,
  twice: 2,
  dbl: 2,
  दोबार: 2,
  دوبار: 2,
  triple: 3,
  thrice: 3,
  तीनबार: 3,
  تینبار: 3,
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

function tokenizeForContactDetection(content: string) {
  const normalized = content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "")

  let expanded = ""
  for (const char of Array.from(normalized)) {
    const digit = unicodeDigitToAscii(char)
    expanded += digit === null ? char : ` ${digit} `
  }

  return expanded.match(/[\p{L}\p{N}]+/gu) || []
}

function extractDigitSignature(content: string) {
  const tokens = tokenizeForContactDetection(content)
  let signature = ""
  let pendingMultiplier = 1

  for (const token of tokens) {
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
