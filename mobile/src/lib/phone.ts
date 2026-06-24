export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function getPhoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidPhoneNumber(value: string) {
  const digits = getPhoneDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

export function getPhoneValidationMessage(value: string) {
  if (!value.trim()) return 'Phone number is required.';
  if (!isValidPhoneNumber(value)) return 'Please enter a valid phone number.';
  return null;
}

export function phonesMatch(left?: string | null, right?: string | null) {
  const leftDigits = getPhoneDigits(left || '');
  const rightDigits = getPhoneDigits(right || '');
  return Boolean(leftDigits && rightDigits && leftDigits === rightDigits);
}

export function getUserPhoneVerifiedAt(user: any, phone: string) {
  if (!user?.phone_confirmed_at) return null;
  const confirmedPhone = normalizePhoneNumber(String(user?.phone || ''));
  const metadataPhone = normalizePhoneNumber(String(user?.user_metadata?.phone || ''));
  if (confirmedPhone) {
    return phonesMatch(confirmedPhone, phone) ? String(user.phone_confirmed_at) : null;
  }
  return metadataPhone && phonesMatch(metadataPhone, phone) ? String(user.phone_confirmed_at) : null;
}
