import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LuxuryButton } from '../../components/LuxuryButton';
import { useAuth } from '../../contexts/AuthContext';
import { calculateAgeFromDate, formatDateForDisplay } from '../../lib/age';
import { completeOnboarding } from '../../lib/pathService';
import {
  saveStep1,
  saveStep2,
  saveStep3,
  saveStep4,
  saveStep5,
  saveStep6,
  saveStep7,
  uploadMatrimonyPhoto,
} from '../../lib/matrimonyService';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

const stepTitles = [
  'Profile setup',
  'About you',
  'Career',
  'Family',
  'Cultural details',
  'Bio',
  'Partner preferences',
];

export function MatrimonySetupScreen() {
  const { refreshAppFlow } = useAuth();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [createdBy, setCreatedBy] = useState<'Self' | 'Parent' | 'Sibling' | 'Other'>('Self');
  const [photos, setPhotos] = useState<string[]>([]);
  const [verifiedDob, setVerifiedDob] = useState<string | null>(null);

  const [heightCm, setHeightCm] = useState('170');
  const [maritalStatus, setMaritalStatus] = useState('Never Married');
  const [diet, setDiet] = useState('Vegetarian');

  const [education, setEducation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [income, setIncome] = useState('');

  const [familyType, setFamilyType] = useState('Nuclear');
  const [familyValues, setFamilyValues] = useState('Moderate');

  const [religion, setReligion] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [community, setCommunity] = useState('');
  const [tob, setTob] = useState('06:00');
  const [pob, setPob] = useState('');

  const [bio, setBio] = useState('');
  const [minAge, setMinAge] = useState('24');
  const [maxAge, setMaxAge] = useState('32');
  const [minHeight, setMinHeight] = useState('150');
  const [maxHeight, setMaxHeight] = useState('185');

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    client.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await client
        .from('user_profiles')
        .select('date_of_birth, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.date_of_birth) {
        setVerifiedDob(data.date_of_birth);
        const nextAge = calculateAgeFromDate(data.date_of_birth);
        if (nextAge) setAge(nextAge);
      }

      if (data?.gender) {
        setGender(
          data.gender === 'male' ? 'Male' : data.gender === 'female' ? 'Female' : 'Other',
        );
      }
    });
  }, []);

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 6 - photos.length),
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    setIsLoading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets.slice(0, 6 - photos.length)) {
        const url = await uploadMatrimonyPhoto({
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        });
        uploaded.push(url);
      }
      setPhotos((current) => [...current, ...uploaded].slice(0, 6));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserId = async () => {
    const {
      data: { user },
    } = await supabase!.auth.getUser();
    if (!user) throw new Error('Please sign in to continue.');
    return user.id;
  };

  const handleNext = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const userId = await getUserId();

      if (step === 0) {
        if (!name.trim()) throw new Error('Enter your full name.');
        if (!age || age < 18) throw new Error('Age must be at least 18.');
        if (photos.length < 2) throw new Error('Add at least 2 profile photos.');
        const result = await saveStep1(userId, {
          name: name.trim(),
          age,
          gender,
          createdBy,
          photoUrls: photos,
        });
        if (!result.success) throw new Error(result.error);
      }

      if (step === 1) {
        const parsedHeight = Number(heightCm);
        if (!parsedHeight) throw new Error('Enter a valid height in cm.');
        const result = await saveStep2(userId, {
          heightCm: parsedHeight,
          maritalStatus,
          diet,
        });
        if (!result.success) throw new Error(result.error);
      }

      if (step === 2) {
        if (!education.trim() || !jobTitle.trim() || !income.trim()) {
          throw new Error('Education, job title, and income are required.');
        }
        const result = await saveStep3(userId, {
          highestEducation: education.trim(),
          jobTitle: jobTitle.trim(),
          annualIncome: income.trim(),
        });
        if (!result.success) throw new Error(result.error);
      }

      if (step === 3) {
        const result = await saveStep4(userId, { familyType, familyValues });
        if (!result.success) throw new Error(result.error);
      }

      if (step === 4) {
        if (!religion.trim() || !motherTongue.trim() || !community.trim() || !pob.trim()) {
          throw new Error('Religion, mother tongue, community, and place of birth are required.');
        }
        const result = await saveStep5(userId, {
          religion: religion.trim(),
          motherTongue: motherTongue.trim(),
          community: community.trim(),
          dob: verifiedDob || '',
          tob: tob.trim(),
          pob: pob.trim(),
        });
        if (!result.success) throw new Error(result.error);
      }

      if (step === 5) {
        if (bio.trim().length < 20) throw new Error('Bio must be at least 20 characters.');
        const result = await saveStep6(userId, bio.trim());
        if (!result.success) throw new Error(result.error);
      }

      if (step === 6) {
        const result = await saveStep7(userId, {
          ageRange: [Number(minAge), Number(maxAge)],
          heightRangeCm: [Number(minHeight), Number(maxHeight)],
        });
        if (!result.success) throw new Error(result.error);

        const completion = await completeOnboarding(userId);
        if (!completion.success) throw new Error(completion.error);

        await refreshAppFlow();
        return;
      }

      setStep((current) => current + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.stepCount}>
          {step + 1}/{stepTitles.length}
        </Text>
        <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" />
            {verifiedDob ? (
              <View style={styles.verifiedCard}>
                <Text style={styles.verifiedKicker}>Verified age</Text>
                <Text style={styles.verifiedValue}>{age} years</Text>
                <Text style={styles.verifiedCopy}>
                  Based on {formatDateForDisplay(verifiedDob)}.
                </Text>
              </View>
            ) : (
              <Field
                label="Age"
                value={age ? String(age) : ''}
                onChangeText={(value) => setAge(Number(value) || null)}
                placeholder="18"
                keyboardType="number-pad"
              />
            )}
            <ChoiceRow
              label="Profile created by"
              options={['Self', 'Parent', 'Sibling', 'Other']}
              value={createdBy}
              onChange={(value) => setCreatedBy(value as typeof createdBy)}
            />
            <LuxuryButton label="Add photos" onPress={() => void pickPhotos()} variant="secondary" />
            <Text style={styles.helper}>Minimum 2 photos, maximum 6.</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <Image key={`${photo}-${index}`} source={{ uri: photo }} style={styles.photo} />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
            <ChoiceRow
              label="Marital status"
              options={['Never Married', 'Divorced', 'Widowed', 'Separated']}
              value={maritalStatus}
              onChange={setMaritalStatus}
            />
            <ChoiceRow
              label="Diet"
              options={['Vegetarian', 'Eggetarian', 'Non-vegetarian', 'Vegan', 'Jain']}
              value={diet}
              onChange={setDiet}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Highest education" value={education} onChangeText={setEducation} />
            <Field label="Job title" value={jobTitle} onChangeText={setJobTitle} />
            <Field label="Annual income" value={income} onChangeText={setIncome} placeholder="e.g. 10-20 LPA" />
          </>
        )}

        {step === 3 && (
          <>
            <ChoiceRow
              label="Family type"
              options={['Nuclear', 'Joint', 'Extended', 'Single Parent']}
              value={familyType}
              onChange={setFamilyType}
            />
            <ChoiceRow
              label="Family values"
              options={['Traditional', 'Moderate', 'Modern', 'Progressive']}
              value={familyValues}
              onChange={setFamilyValues}
            />
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Religion" value={religion} onChangeText={setReligion} />
            <Field label="Mother tongue" value={motherTongue} onChangeText={setMotherTongue} />
            <Field label="Community" value={community} onChangeText={setCommunity} />
            <Field label="Time of birth" value={tob} onChangeText={setTob} placeholder="HH:MM" />
            <Field label="Place of birth" value={pob} onChangeText={setPob} />
          </>
        )}

        {step === 5 && (
          <Field
            label="About you"
            value={bio}
            onChangeText={setBio}
            placeholder="Write at least 20 characters about yourself."
            multiline
          />
        )}

        {step === 6 && (
          <>
            <Field label="Minimum partner age" value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
            <Field label="Maximum partner age" value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
            <Field label="Minimum height (cm)" value={minHeight} onChangeText={setMinHeight} keyboardType="number-pad" />
            <Field label="Maximum height (cm)" value={maxHeight} onChangeText={setMaxHeight} keyboardType="number-pad" />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <LuxuryButton
            label="Back"
            onPress={() => setStep((current) => current - 1)}
            variant="secondary"
            style={styles.backButton}
          />
        ) : null}
        <LuxuryButton
          disabled={isLoading}
          label={isLoading ? 'Saving...' : step === 6 ? 'Finish setup' : 'Continue'}
          onPress={() => void handleNext()}
        />
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.taupe}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.choice, value === option && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, value === option && styles.choiceTextActive]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ivory },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  stepCount: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  stepTitle: {
    marginTop: spacing.xs,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  backButton: { marginBottom: spacing.xs },
  field: { gap: spacing.xs },
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
  textarea: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: 'top' },
  helper: { color: colors.muted, fontSize: 13 },
  verifiedCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  verifiedKicker: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  verifiedValue: {
    marginTop: spacing.xs,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
  },
  verifiedCopy: { marginTop: spacing.xs, color: colors.muted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 96, height: 96, borderRadius: radius.sm },
  choiceWrap: { gap: spacing.sm },
  choice: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choiceActive: { borderColor: colors.rose, backgroundColor: colors.rose },
  choiceText: { color: colors.ink, fontWeight: '700' },
  choiceTextActive: { color: colors.white },
  error: { color: colors.roseDark, fontWeight: '700', textAlign: 'center' },
});
