import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryButton } from '../components/LuxuryButton';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';

type AuthView = 'landing' | 'login' | 'signup';

const trustSignals = ['Verified profiles', 'Premium discovery', 'Family-ready context'];
const logoImage = require('../../assets/lovesathi-logo.jpeg');
const WHATSAPP_URL = 'https://wa.me/919175554708';

export function AuthScreen() {
  const { signIn, signUp, isLoading, authError, clearAuthError } = useAuth();
  const [view, setView] = useState<AuthView>('landing');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const { width } = useWindowDimensions();
  const isWide = width >= 820;

  const resetForm = () => {
    clearAuthError();
    setFormData({ name: '', email: '', phone: '', password: '' });
  };

  const switchView = (next: AuthView) => {
    resetForm();
    setView(next);
  };

  if (view === 'landing') {
    return (
      <SafeAreaView style={styles.landingRoot}>
        <ScrollView contentContainerStyle={styles.landingContent}>
          <View style={styles.brandMark}>
            <View style={styles.logoFrame}>
              <Image source={logoImage} resizeMode="contain" style={styles.logo} />
            </View>
            <Text style={styles.brandKicker}>Premium matrimony</Text>
          </View>

          <Text style={styles.hero}>
            Find a match with depth, dignity, and taste.
          </Text>
          <Text style={styles.heroCopy}>
            Verified identity, rich profiles, family context, and calm discovery
            for people ready to choose seriously.
          </Text>

          <View style={styles.trustRow}>
            {trustSignals.map((label) => (
              <View key={label} style={styles.trustCard}>
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <LuxuryButton label="Continue with Email" onPress={() => switchView('signup')} />
            <LuxuryButton
              label="Sign in"
              onPress={() => switchView('login')}
              style={styles.secondaryButton}
              variant="secondary"
            />
            {!isSupabaseConfigured && (
              <Text style={styles.configWarning}>
                Add Supabase keys to `.env` before using production auth.
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => void Linking.openURL(WHATSAPP_URL)}
            style={styles.whatsAppCard}
          >
            <Text style={styles.whatsAppKicker}>Chat on WhatsApp</Text>
            <Text style={styles.whatsAppNumber}>+91 91755 54708</Text>
            <Text style={styles.whatsAppCopy}>Tap to message LoveSathi support.</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isSignup = view === 'signup';

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={[styles.formContent, isWide && styles.wideForm]}>
          <Pressable onPress={() => switchView('landing')} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.cardKicker}>
              {isSignup ? 'Member access' : 'Welcome back'}
            </Text>
            <Text style={styles.title}>
              {isSignup ? 'Create your profile' : 'Sign in to Lovesathi'}
            </Text>

            {isSignup && (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  onChangeText={(name) => setFormData((current) => ({ ...current, name }))}
                  placeholder="Your full name"
                  placeholderTextColor={colors.taupe}
                  style={styles.input}
                  value={formData.name}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(email) => setFormData((current) => ({ ...current, email }))}
              placeholder="you@email.com"
              placeholderTextColor={colors.taupe}
              style={styles.input}
              value={formData.email}
            />

            {isSignup && (
              <>
                <Text style={styles.label}>Phone number (optional)</Text>
                <TextInput
                  keyboardType="phone-pad"
                  onChangeText={(phone) => setFormData((current) => ({ ...current, phone }))}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.taupe}
                  style={styles.input}
                  value={formData.phone}
                />
                <Text style={styles.helperText}>You can add and verify your phone later from Edit Profile.</Text>
              </>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={(password) => setFormData((current) => ({ ...current, password }))}
              placeholder={isSignup ? 'Create a secure password' : 'Enter your password'}
              placeholderTextColor={colors.taupe}
              secureTextEntry
              style={styles.input}
              value={formData.password}
            />

            {authError ? <Text style={styles.error}>{authError}</Text> : null}

            <LuxuryButton
              disabled={isLoading}
              label={isLoading ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
              onPress={() =>
                void (isSignup
                  ? signUp(formData)
                  : signIn({ email: formData.email, password: formData.password, phone: formData.phone }))
              }
            />

            <Pressable
              onPress={() => switchView(isSignup ? 'login' : 'signup')}
              style={styles.switchLink}
            >
              <Text style={styles.switchText}>
                {isSignup ? 'Already have an account? Sign in' : 'Need an account? Create one'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  landingRoot: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  landingContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  brandMark: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoFrame: {
    width: 260,
    height: 120,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    padding: spacing.sm,
    ...shadow,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandKicker: {
    marginTop: spacing.xs,
    color: colors.champagne,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  hero: {
    color: colors.white,
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  heroCopy: {
    color: colors.champagneSoft,
    fontSize: 16,
    lineHeight: 24,
  },
  trustRow: {
    gap: spacing.sm,
  },
  trustCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  trustText: {
    color: colors.white,
    fontWeight: '800',
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...shadow,
  },
  formContent: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  wideForm: {
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.mocha,
    fontWeight: '800',
  },
  cardKicker: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    color: colors.ink,
    fontWeight: '800',
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
  secondaryButton: {
    marginTop: spacing.sm,
  },
  configWarning: {
    marginTop: spacing.md,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  whatsAppCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
  },
  whatsAppKicker: {
    color: colors.champagne,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  whatsAppNumber: {
    marginTop: spacing.xs,
    color: colors.white,
    fontSize: 24,
    fontWeight: '900',
  },
  whatsAppCopy: {
    marginTop: spacing.xs,
    color: colors.champagneSoft,
    lineHeight: 21,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.roseDark,
    fontWeight: '700',
    textAlign: 'center',
  },
  helperText: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  switchLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchText: {
    color: colors.rose,
    fontWeight: '800',
  },
});
