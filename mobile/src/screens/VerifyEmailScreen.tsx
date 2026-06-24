import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryButton } from '../components/LuxuryButton';
import { useAuth } from '../contexts/AuthContext';
import { EMAIL_VERIFICATION_STORAGE_KEY } from '../lib/authHelpers';
import { colors, radius, shadow, spacing } from '../theme';

export function VerifyEmailScreen() {
  const { user, refreshAppFlow, signOut } = useAuth();
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(EMAIL_VERIFICATION_STORAGE_KEY).then((value) => {
      setPendingEmail(value || user?.email || '');
    });
  }, [user?.email]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Verification required</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.copy}>
          We sent a confirmation link to{' '}
          <Text style={styles.email}>{pendingEmail || 'your email address'}</Text>.
          Open it on this device, then return here and tap refresh.
        </Text>
        <LuxuryButton label="I verified my email" onPress={() => void refreshAppFlow()} />
        <LuxuryButton
          label="Sign out"
          onPress={() => void signOut()}
          style={styles.secondary}
          variant="secondary"
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
  email: {
    color: colors.ink,
    fontWeight: '800',
  },
  secondary: {
    marginTop: spacing.sm,
  },
});
