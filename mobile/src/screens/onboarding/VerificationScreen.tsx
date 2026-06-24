import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryButton } from '../../components/LuxuryButton';
import { PHONE_VERIFICATION_STORAGE_KEY } from '../../lib/authHelpers';
import { calculateAgeFromDate, getMinimumBirthDate } from '../../lib/age';
import {
  PHONE_OTP_LENGTH,
  normalizePhoneOtpCode,
  requestCurrentUserPhoneOtp,
  verifyCurrentUserPhoneOtp,
} from '../../lib/phoneOtp';
import { type UploadFile } from '../../lib/storageUpload';
import { supabase } from '../../lib/supabase';
import { completeIDVerification, saveDateOfBirth, saveGender } from '../../lib/verificationApi';
import { colors, radius, spacing } from '../../theme';

type VerificationStep = 'phone' | 'profile' | 'gender' | 'id';

type VerificationScreenProps = {
  onComplete: () => void;
  onSkip: () => void;
};

export function VerificationScreen({ onComplete, onSkip }: VerificationScreenProps) {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'prefer_not_to_say' | null>(null);
  const [idFile, setIdFile] = useState<UploadFile | null>(null);
  const [faceFile, setFaceFile] = useState<UploadFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minimumBirthDate = getMinimumBirthDate(18);

  const age = calculateAgeFromDate(dob);
  const underage = age !== null && age < 18;

  useEffect(() => {
    const loadPhone = async () => {
      const storedPhone = await AsyncStorage.getItem(PHONE_VERIFICATION_STORAGE_KEY);
      let authPhone = '';

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        authPhone = String(user?.phone || user?.user_metadata?.phone || '');
      }

      setPhone(storedPhone || authPhone);
    };

    void loadPhone();
  }, []);

  const sendPhoneCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await requestCurrentUserPhoneOtp(phone);
      if (result.alreadyVerified) {
        await AsyncStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY);
        setStep('profile');
        return;
      }
      setPhoneOtpSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not send phone code.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await verifyCurrentUserPhoneOtp(phone, phoneCode);
      await AsyncStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY);
      setStep('profile');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not verify phone code.');
    } finally {
      setIsLoading(false);
    }
  };

  const skipPhoneVerification = async () => {
    await AsyncStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY);
    setStep('profile');
  };

  const pickIdDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIdFile({
      uri: asset.uri,
      name: asset.name || 'id-document.jpg',
      mimeType: asset.mimeType || 'application/octet-stream',
      size: asset.size,
    });
  };

  const pickFaceScan = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to capture your face scan.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFaceFile({
      uri: asset.uri,
      name: `face-scan-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
  };

  const handleProfileContinue = async () => {
    setError(null);
    if (!dob) {
      setError('Please enter your date of birth.');
      return;
    }
    if (underage) {
      setError('You must be at least 18 years old to use Lovesathi.');
      return;
    }

    setIsLoading(true);
    const result = await saveDateOfBirth(dob);
    setIsLoading(false);

    if (result.success) {
      setStep('gender');
    } else {
      setError(result.error || 'Failed to save date of birth.');
    }
  };

  const handleGenderContinue = async () => {
    if (!gender) return;
    setIsLoading(true);
    const result = await saveGender(gender);
    setIsLoading(false);

    if (result.success) {
      setStep('id');
    } else {
      setError(result.error || 'Failed to save gender.');
    }
  };

  const handleComplete = async () => {
    if (!idFile || !faceFile) {
      setError('Upload both your ID document and face scan, or skip for now.');
      return;
    }

    setIsLoading(true);
    const result = await completeIDVerification(idFile, faceFile);
    setIsLoading(false);

    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to submit verification.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Progress step={step} />

        {step === 'phone' && (
          <>
            <Text style={styles.title}>Verify your phone</Text>
            <Text style={styles.copy}>
              We use Supabase and Twilio to send a one-time code. You can skip and verify later from Edit Profile.
            </Text>
            <Text style={styles.label}>Phone number with country code</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.taupe}
              style={styles.input}
              value={phone}
            />
            {phoneOtpSent && (
              <>
                <Text style={styles.label}>Phone code</Text>
                <TextInput
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  maxLength={PHONE_OTP_LENGTH}
                  onChangeText={(value) => setPhoneCode(normalizePhoneOtpCode(value))}
                  placeholder="000000"
                  placeholderTextColor={colors.taupe}
                  style={[styles.input, styles.otpInput]}
                  value={phoneCode}
                />
              </>
            )}
          </>
        )}

        {step === 'profile' && (
          <>
            <Text style={styles.title}>Confirm your birth date</Text>
            <Text style={styles.copy}>Minimum age is 18. Use YYYY-MM-DD format.</Text>
            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              placeholder={`e.g. ${minimumBirthDate}`}
              placeholderTextColor={colors.taupe}
              style={styles.input}
              value={dob}
              onChangeText={setDob}
            />
            {dob ? <Text style={styles.helper}>Age: {age ?? '-'}</Text> : null}
          </>
        )}

        {step === 'gender' && (
          <>
            <Text style={styles.title}>Who are you?</Text>
            <Text style={styles.copy}>Select your gender.</Text>
            {(['male', 'female', 'prefer_not_to_say'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setGender(option)}
                style={[styles.choice, gender === option && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, gender === option && styles.choiceTextActive]}>
                  {option === 'male' ? 'Male' : option === 'female' ? 'Female' : 'Prefer not to say'}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        {step === 'id' && (
          <>
            <Text style={styles.title}>ID verification</Text>
            <Text style={styles.copy}>
              Optional but recommended. Upload an ID document and capture a face scan.
            </Text>
            <LuxuryButton label="Upload ID document" onPress={() => void pickIdDocument()} variant="secondary" />
            {idFile ? <Text style={styles.helper}>Selected: {idFile.name}</Text> : null}
            <LuxuryButton
              label="Capture face scan"
              onPress={() => void pickFaceScan()}
              style={styles.gap}
              variant="secondary"
            />
            {faceFile ? <Text style={styles.helper}>Face scan ready</Text> : null}
            <LuxuryButton label="Skip for now" onPress={onSkip} style={styles.gap} variant="ghost" />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'phone' && (
          <>
            <LuxuryButton
              disabled={
                isLoading ||
                !phone.trim() ||
                (phoneOtpSent && phoneCode.length !== PHONE_OTP_LENGTH)
              }
              label={
                isLoading
                  ? 'Please wait...'
                  : phoneOtpSent
                    ? 'Verify phone code'
                    : 'Send phone code'
              }
              onPress={() => void (phoneOtpSent ? verifyPhoneCode() : sendPhoneCode())}
            />
            {phoneOtpSent && (
              <LuxuryButton
                disabled={isLoading}
                label="Resend phone code"
                onPress={() => void sendPhoneCode()}
                style={styles.gap}
                variant="secondary"
              />
            )}
            <LuxuryButton
              disabled={isLoading}
              label="Skip for now"
              onPress={() => void skipPhoneVerification()}
              style={styles.gap}
              variant="ghost"
            />
          </>
        )}

        {step === 'profile' && (
          <LuxuryButton
            disabled={isLoading || !dob || underage}
            label={isLoading ? 'Saving...' : 'Continue'}
            onPress={() => void handleProfileContinue()}
          />
        )}
        {step === 'gender' && (
          <LuxuryButton
            disabled={isLoading || !gender}
            label={isLoading ? 'Saving...' : 'Continue'}
            onPress={() => void handleGenderContinue()}
          />
        )}
        {step === 'id' && (
          <LuxuryButton
            disabled={isLoading}
            label={isLoading ? 'Submitting...' : 'Submit verification'}
            onPress={() => void handleComplete()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Progress({ step }: { step: VerificationStep }) {
  const index = step === 'phone' ? 1 : step === 'profile' ? 2 : step === 'gender' ? 3 : 4;
  return (
    <View style={styles.progressRow}>
      {[1, 2, 3, 4].map((dot) => (
        <View key={dot} style={[styles.progressDot, dot === index && styles.progressDotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: spacing.lg, gap: spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  progressDotActive: { width: 28, backgroundColor: colors.rose },
  title: {
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: '700',
  },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.ink, fontWeight: '800' },
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
  helper: { color: colors.muted, fontSize: 14 },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  choice: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choiceActive: {
    borderColor: colors.rose,
    backgroundColor: colors.rose,
  },
  choiceText: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  choiceTextActive: { color: colors.white },
  gap: { marginTop: spacing.sm },
  error: { color: colors.roseDark, fontWeight: '700', textAlign: 'center' },
});
