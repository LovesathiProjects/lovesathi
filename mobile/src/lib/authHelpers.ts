export const EMAIL_VERIFICATION_STORAGE_KEY = 'lovesathi.pendingVerificationEmail';
export const PHONE_VERIFICATION_STORAGE_KEY = 'lovesathi.pendingVerificationPhone';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmailNotConfirmedError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  const code = maybeError.code?.toLowerCase();
  const message = maybeError.message?.toLowerCase() || '';

  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}
