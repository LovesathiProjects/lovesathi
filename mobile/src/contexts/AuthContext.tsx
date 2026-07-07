import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  EMAIL_VERIFICATION_STORAGE_KEY,
  PHONE_VERIFICATION_STORAGE_KEY,
  isEmailNotConfirmedError,
  normalizeEmail,
} from '../lib/authHelpers';
import {
  getPhoneValidationMessage,
  normalizePhoneNumber,
} from '../lib/phone';
import { type AppFlow, resolveAppFlow } from '../lib/profileRouting';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  appFlow: AppFlow;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signUp: (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  signIn: (input: { email: string; password: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppFlow: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appFlow, setAppFlow] = useState<AppFlow>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncAppFlow = useCallback(async (nextSession: Session | null) => {
    if (!isSupabaseConfigured || !supabase) {
      setAppFlow('auth');
      return;
    }

    setAppFlow('loading');
    const flow = await resolveAppFlow(nextSession);
    setAppFlow(flow);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAppFlow('auth');
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void syncAppFlow(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void syncAppFlow(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [syncAppFlow]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signUp = useCallback(async (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    if (!supabase) {
      setAuthError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const email = normalizeEmail(input.email);
      const phone = normalizePhoneNumber(input.phone || '');
      if (phone) {
        const phoneError = getPhoneValidationMessage(phone);
        if (phoneError) throw new Error(phoneError);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            full_name: input.name,
            ...(phone ? { phone } : {}),
          },
        },
      });

      if (error) throw error;

      await AsyncStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, email);
      if (phone) {
        await AsyncStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, phone);
      } else {
        await AsyncStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY);
      }

      if (data.session) {
        setSession(data.session);
        await syncAppFlow(data.session);
      } else {
        setSession(null);
        setAppFlow('verify-email');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [syncAppFlow]);

  const signIn = useCallback(async (input: {
    email: string;
    password: string;
    phone?: string;
  }) => {
    if (!supabase) {
      setAuthError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const email = normalizeEmail(input.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: input.password,
      });

      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        await AsyncStorage.setItem(EMAIL_VERIFICATION_STORAGE_KEY, email);
        if (input.phone) {
          await AsyncStorage.setItem(
            PHONE_VERIFICATION_STORAGE_KEY,
            normalizePhoneNumber(input.phone),
          );
        }
        setSession(data.session);
        setAppFlow('verify-email');
        return;
      }

      await syncAppFlow(data.session);
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        await AsyncStorage.setItem(
          EMAIL_VERIFICATION_STORAGE_KEY,
          normalizeEmail(input.email),
        );
        if (input.phone) {
          await AsyncStorage.setItem(
            PHONE_VERIFICATION_STORAGE_KEY,
            normalizePhoneNumber(input.phone),
          );
        }
        setSession(null);
        setAppFlow('verify-email');
        return;
      }

      setAuthError(error instanceof Error ? error.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }, [syncAppFlow]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      await Promise.all([
        AsyncStorage.removeItem(EMAIL_VERIFICATION_STORAGE_KEY),
        AsyncStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY),
      ]);
      setSession(null);
      setAppFlow('auth');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAppFlow = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await syncAppFlow(data.session);
  }, [syncAppFlow]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      appFlow,
      isLoading,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      refreshAppFlow,
    }),
    [
      session,
      appFlow,
      isLoading,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      refreshAppFlow,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
