const CONTACT_DIGIT_THRESHOLD = 4;
const RECENT_CONTEXT_LIMIT = 12;

export const CONTACT_SHARING_BLOCKED_MESSAGE =
  'For safety, contact details cannot be shared in chat. Premium members can reveal phone numbers from the profile.';

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
];

const DIGIT_WORDS: Record<string, string> = {
  '0': '0',
  zero: '0',
  oh: '0',
  o: '0',
  nil: '0',
  nought: '0',
  shunya: '0',
  sunya: '0',
  sifr: '0',
  poojyam: '0',
  sunnah: '0',
  '1': '1',
  one: '1',
  won: '1',
  ek: '1',
  aik: '1',
  ondru: '1',
  okati: '1',
  ondu: '1',
  '2': '2',
  two: '2',
  too: '2',
  do: '2',
  dou: '2',
  rendu: '2',
  eradu: '2',
  irandu: '2',
  '3': '3',
  three: '3',
  tree: '3',
  teen: '3',
  tin: '3',
  moonu: '3',
  mudu: '3',
  mooru: '3',
  '4': '4',
  four: '4',
  fore: '4',
  char: '4',
  chaar: '4',
  naalu: '4',
  nalku: '4',
  '5': '5',
  five: '5',
  paanch: '5',
  panch: '5',
  aindhu: '5',
  aidu: '5',
  '6': '6',
  six: '6',
  che: '6',
  chhe: '6',
  chhah: '6',
  aaru: '6',
  '7': '7',
  seven: '7',
  saat: '7',
  sat: '7',
  elu: '7',
  '8': '8',
  eight: '8',
  aath: '8',
  ath: '8',
  ettu: '8',
  enimidi: '8',
  '9': '9',
  nine: '9',
  nain: '9',
  nau: '9',
  onpathu: '9',
  tommidi: '9',
};

const MULTIPLIERS: Record<string, number> = {
  double: 2,
  twice: 2,
  dbl: 2,
  triple: 3,
  thrice: 3,
};

const EMAIL_ADDRESS_PATTERN = /[a-z0-9._%+-]{2,}\s*@\s*[a-z0-9.-]{2,}\s*\.\s*[a-z]{2,}/i;
const EMAIL_WORD_PATTERN =
  /\b(?:gmail|yahoo|icloud|outlook|hotmail|proton|rediffmail|mail)\s*(?:dot|\.)\s*(?:com|in|co|net|org)\b/i;
const SOCIAL_LINK_PATTERN =
  /\b(?:wa\.me|whatsapp\.com|t\.me|telegram\.me|telegram\.org|instagram\.com|facebook\.com|fb\.com|snapchat\.com|signal\.me)\b/i;
const SOCIAL_HANDLE_PATTERN = /(^|[\s([{])@[a-z0-9._]{3,}/i;
const CONTACT_INTENT_PATTERN =
  /\b(?:message|msg|dm|ping|text|call|reach|contact)\s+(?:me\s+)?(?:on|at|via)\s+(?:whatsapp|watsapp|wa|instagram|insta|ig|telegram|tg|snapchat|snap|facebook|fb|signal)\b/i;
const CONTACT_REQUEST_PATTERN =
  /\b(?:send|share|give|drop|type)\s+(?:me\s+)?(?:your|ur|u r\s+)?(?:phone|mobile|number|digits|contact|whatsapp|wa)\b/i;
const SOCIAL_LABEL_PATTERN =
  /\b(?:my|mine|mera|meri)\s+(?:telegram|tg|insta|instagram|ig|snap|snapchat|facebook|fb|signal)\s*(?:id|handle|username|user)?\s*(?:is|:|-)\s*@?[a-z0-9._]{3,}\b/i;

function unicodeDigitToAscii(char: string) {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return null;

  if (codePoint >= 48 && codePoint <= 57) {
    return String(codePoint - 48);
  }

  for (const zero of UNICODE_ZERO_CODE_POINTS) {
    if (codePoint >= zero && codePoint <= zero + 9) {
      return String(codePoint - zero);
    }
  }

  return null;
}

function normalizeForContactDetection(content: string) {
  return content
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
    .replace(/[|!]/g, '1')
    .replace(/[$]/g, '5')
    .replace(/[@]/g, '0');
}

function normalizeReadableContactText(content: string) {
  return content
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '');
}

function tokenizeForContactDetection(content: string) {
  const normalized = normalizeForContactDetection(content);

  let expanded = '';
  for (const char of Array.from(normalized)) {
    const digit = unicodeDigitToAscii(char);
    expanded += digit === null ? char : ` ${digit} `;
  }

  return expanded.match(/[\p{L}\p{N}]+/gu) || [];
}

function compactSingleLetterRuns(tokens: string[]) {
  const compacted: string[] = [];
  let run = '';

  for (const token of tokens) {
    if (/^[a-z]$/.test(token)) {
      run += token;
      continue;
    }

    if (run.length >= 3) compacted.push(run);
    run = '';
  }

  if (run.length >= 3) compacted.push(run);
  return compacted;
}

function extractDigitSignature(content: string) {
  const tokens = tokenizeForContactDetection(content);
  const expandedTokens = [...tokens, ...compactSingleLetterRuns(tokens)];
  let signature = '';
  let pendingMultiplier = 1;

  for (const token of expandedTokens) {
    if (MULTIPLIERS[token]) {
      pendingMultiplier = MULTIPLIERS[token];
      continue;
    }

    if (/^[0-9]+$/.test(token)) {
      signature += token.repeat(pendingMultiplier);
      pendingMultiplier = 1;
      continue;
    }

    const digit = DIGIT_WORDS[token];
    if (digit) {
      signature += digit.repeat(pendingMultiplier);
      pendingMultiplier = 1;
      continue;
    }

    pendingMultiplier = 1;
  }

  return signature;
}

function containsContactDetailPattern(content: string) {
  const normalized = normalizeReadableContactText(content);

  return (
    EMAIL_ADDRESS_PATTERN.test(normalized) ||
    EMAIL_WORD_PATTERN.test(normalized) ||
    SOCIAL_LINK_PATTERN.test(normalized) ||
    SOCIAL_HANDLE_PATTERN.test(normalized) ||
    CONTACT_INTENT_PATTERN.test(normalized) ||
    CONTACT_REQUEST_PATTERN.test(normalized) ||
    SOCIAL_LABEL_PATTERN.test(normalized)
  );
}

export function getRecentOutgoingMessageContents(
  messages: Array<{ sender_id: string; content?: string | null }>,
  senderId: string,
) {
  return messages
    .filter((message) => message.sender_id === senderId && message.content)
    .slice(-RECENT_CONTEXT_LIMIT)
    .map((message) => message.content || '');
}

export function containsShareableNumber(content: string, contextMessages: string[] = []) {
  if (containsContactDetailPattern(content)) return true;

  const currentSignature = extractDigitSignature(content);
  if (currentSignature.length >= CONTACT_DIGIT_THRESHOLD) return true;

  if (contextMessages.length === 0) return false;

  const contextContent = [...contextMessages, content].join(' ');
  if (containsContactDetailPattern(contextContent)) return true;

  if (currentSignature.length === 0) return false;

  const contextSignature = extractDigitSignature(contextContent);
  return contextSignature.length >= CONTACT_DIGIT_THRESHOLD;
}
