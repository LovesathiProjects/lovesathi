import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryButton } from '../components/LuxuryButton';
import { useAuth } from '../contexts/AuthContext';
import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  normalizeEmail,
} from '../lib/authHelpers';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';

const EMAIL_OTP_LENGTH = 6;

function normalizeOtp(value: string) {
  return value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH);
}

export function VerifyEmailScreen() {
  const { refreshAppFlow, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY).then((value) => {
      setEmail(value || '');
    });
  }, []);

  const resendCode = async () => {
    if (!supabase) return;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError('Enter the email used to create your account.');
      return;
    }

    setIsBusy(true);
    setError(null);
    setStatus('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      });
      if (resendError) throw resendError;

      await AsyncStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, normalizedEmail);
      setStatus('A fresh 6-digit email code has been sent.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not resend the code.');
    } finally {
      setIsBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!supabase) return;
    const normalizedEmail = normalizeEmail(email);
    const token = normalizeOtp(otp);

    if (!normalizedEmail) {
      setError('Enter the email used to create your account.');
      return;
    }
    if (token.length !== EMAIL_OTP_LENGTH) {
      setError('Enter the complete 6-digit email code.');
      return;
    }

    setIsBusy(true);
    setError(null);
    setStatus('Verifying your email...');

    try {
      let lastError: Error | null = null;
      for (const type of ['email', 'signup'] as const) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token,
          type,
        });
        if (!verifyError) {
          lastError = null;
          break;
        }
        lastError = verifyError;
      }

      if (lastError) throw lastError;

      await AsyncStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY);
      setStatus('Email verified. Continuing securely...');
      await refreshAppFlow();
    } catch (nextError) {
      setStatus('');
      setError(nextError instanceof Error ? nextError.message : 'This code is invalid or expired.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Account verification</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.copy}>
          Enter the 6-digit code Lovesathi sent to your email address.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={colors.taupe}
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Email code</Text>
        <TextInput
          autoComplete="one-time-code"
          keyboardType="number-pad"
          maxLength={EMAIL_OTP_LENGTH}
          onChangeText={(value) => setOtp(normalizeOtp(value))}
          placeholder="000000"
          placeholderTextColor={colors.taupe}
          style={[styles.input, styles.otpInput]}
          value={otp}
        />

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <LuxuryButton
          disabled={isBusy || otp.length !== EMAIL_OTP_LENGTH}
          label={isBusy ? 'Please wait...' : 'Verify email'}
          onPress={() => void verifyCode()}
        />
        <LuxuryButton
          disabled={isBusy}
          label="Resend email code"
          onPress={() => void resendCode()}
          style={styles.secondary}
          variant="secondary"
        />
        <LuxuryButton
          disabled={isBusy}
          label="Use another account"
          onPress={() => void signOut()}
          style={styles.secondary}
          variant="ghost"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow,
  },
  kicker: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.ink,
    fontWeight: '800',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  status: {
    color: colors.muted,
    fontWeight: '700',
    marginVertical: spacing.md,
    textAlign: 'center',
  },
  error: {
    color: colors.roseDark,
    fontWeight: '700',
    marginVertical: spacing.md,
    textAlign: 'center',
  },
  secondary: {
    marginTop: spacing.sm,
  },
});
