import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { useAuth } from '../contexts/AuthContext';
import {
  loadDiscovery,
  recordDiscoveryAction,
  toggleNativeShortlist,
  type DiscoveryAction,
  type NativeMatrimonyProfile,
} from '../lib/discoveryService';
import { createNativeDirectChat } from '../lib/nativeSocialService';
import type { MainTabParamList } from '../navigation/types';
import { colors, radius, shadow, spacing } from '../theme';

export function DiscoveryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Discover'>>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [profiles, setProfiles] = useState<NativeMatrimonyProfile[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [swipeRemaining, setSwipeRemaining] = useState<number | null>(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const snapshot = await loadDiscovery(user.id);
      setProfiles(snapshot.profiles);
      setShortlistedIds(snapshot.shortlistedIds);
      setSwipeRemaining(snapshot.swipeRemaining);
      setIsPremium(snapshot.isPremium);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not prepare discovery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const profile = profiles[0];

  const removeCurrentProfile = useCallback((profileId: string) => {
    setProfiles((current) => current.filter((item) => item.id !== profileId));
  }, []);

  const runAction = useCallback(async (action: DiscoveryAction) => {
    if (!user || !profile || actionBusy) return;
    if (action !== 'super_like' && swipeRemaining === 0) {
      Alert.alert(
        'Discovery limit reached',
        'Free members can review 15 profiles every 12 hours. Upgrade for unlimited discovery.',
      );
      return;
    }

    setActionBusy(true);
    try {
      const result = await recordDiscoveryAction(user.id, profile.id, action);
      removeCurrentProfile(profile.id);
      if (action !== 'super_like' && swipeRemaining !== null) {
        setSwipeRemaining(Math.max(swipeRemaining - 1, 0));
      }

      if (result.isMatch) {
        Alert.alert("It's a match", `${profile.name} has also shown interest. You can now start a conversation.`);
      } else if (action === 'like') {
        Alert.alert('Interest sent', `${profile.name} will see your introduction.`);
      } else if (action === 'super_like') {
        Alert.alert('Super Interest sent', 'Your profile will be shown above regular interests.');
      }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Please try again.';
      Alert.alert(/limit|upgrade/i.test(message) ? 'Upgrade to continue' : 'Could not update discovery', message);
      await loadProfiles(true);
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, loadProfiles, profile, removeCurrentProfile, swipeRemaining, user]);

  const toggleShortlist = useCallback(async () => {
    if (!user || !profile || actionBusy) return;
    const currentlySaved = shortlistedIds.has(profile.id);
    setActionBusy(true);
    try {
      const saved = await toggleNativeShortlist(user.id, profile.id, currentlySaved);
      setShortlistedIds((current) => {
        const next = new Set(current);
        saved ? next.add(profile.id) : next.delete(profile.id);
        return next;
      });
      Alert.alert(saved ? 'Saved to shortlist' : 'Removed from shortlist', profile.name);
    } catch (shortlistError) {
      const message = shortlistError instanceof Error ? shortlistError.message : 'Please try again.';
      Alert.alert(/limit|upgrade/i.test(message) ? 'Upgrade to save more' : 'Could not update shortlist', message);
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, profile, shortlistedIds, user]);

  const openChat = useCallback(async () => {
    if (!profile || !user || actionBusy) return;

    setActionBusy(true);
    try {
      const matchId = await createNativeDirectChat(profile.id);
      navigation.navigate('Chat', { matchId });
    } catch (chatError) {
      const message = chatError instanceof Error ? chatError.message : 'Please try again.';
      Alert.alert(/limit|upgrade|premium/i.test(message) ? 'Upgrade to chat' : 'Could not open chat', message);
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, navigation, profile, user]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.rose} size="large" />
        <Text style={styles.stateTitle}>Preparing your introductions</Text>
        <Text style={styles.stateCopy}>Matching verified profile and preference signals.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.wrap, isWide && styles.wideWrap]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadProfiles(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sideCard, isWide ? undefined : styles.mobileIntro]}>
        <Text style={styles.kicker}>Lovesathi matches</Text>
        <Text style={styles.sideTitle}>Curated discovery</Text>
        <Text style={styles.sideCopy}>
          One serious introduction at a time, ordered by compatibility and trust signals.
        </Text>
        <View style={styles.metricRow}>
          <Metric value={String(profiles.length)} label="Ready" />
          <Metric value={isPremium ? 'Max' : String(swipeRemaining ?? 0)} label="Swipes" />
        </View>
      </View>

      {!profile ? (
        <View style={styles.emptyCard}>
          <Text style={styles.stateTitle}>{error ? 'Discovery needs attention' : 'You are caught up'}</Text>
          <Text style={styles.stateCopy}>
            {error ?? 'New introductions will appear as eligible profiles join or your filters change.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => void loadProfiles(true)}>
            <Text style={styles.retryText}>Refresh discovery</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.cardShell, isWide && styles.cardShellWide]}>
          <View style={styles.photoPanel}>
            {profile.photos[0] ? (
              <Image source={{ uri: profile.photos[0] }} resizeMode="cover" style={styles.fill} />
            ) : (
              <LinearGradient colors={[colors.champagneSoft, '#CDB88E', colors.ink]} style={styles.fill} />
            )}
            <LinearGradient colors={['transparent', 'rgba(20,32,51,0.15)', 'rgba(20,32,51,0.9)']} style={styles.fill} />
            {!profile.photos[0] && (
              <ProfilePhoto initials={getInitials(profile.name)} size={138} />
            )}
            <View style={styles.topActions}>
              <SmallAction
                label={shortlistedIds.has(profile.id) ? 'Saved' : 'Save'}
                active={shortlistedIds.has(profile.id)}
                onPress={() => void toggleShortlist()}
              />
              <SmallAction label="Super" onPress={() => void runAction('super_like')} />
            </View>
            <View style={styles.photoIdentity}>
              <View style={styles.badges}>
                {profile.verified && <Text style={styles.badge}>Verified</Text>}
                {profile.premium && <Text style={styles.badgeDark}>Premium</Text>}
              </View>
              <Text style={styles.photoName}>{profile.name}, {profile.age}</Text>
              <Text style={styles.photoLocation}>{profile.location}</Text>
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.identityRow}>
              <View>
                <Text style={styles.name}>{profile.name}, {profile.age}</Text>
                <Text style={styles.id}>ID - {profile.publicProfileId}</Text>
              </View>
              <Text style={styles.matchPill}>{profile.matchScore}% fit</Text>
            </View>
            <Text style={styles.location}>{profile.location} · {profile.height}</Text>
            <View style={styles.infoGrid}>
              <Info label="Community" value={profile.community} />
              <Info label="Profession" value={profile.profession} />
              <Info label="Education" value={profile.education} />
              <Info label="Income" value={profile.income} />
            </View>
            <Text style={styles.about} numberOfLines={3}>{profile.about}</Text>
          </View>

          <View style={styles.preferenceCard}>
            <View>
              <Text style={styles.preferenceTitle}>Compatibility preview</Text>
              <Text style={styles.preferenceText}>You match {profile.matchScore}% of key preference signals</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Action label="Pass" onPress={() => void runAction('pass')} variant="outline" disabled={actionBusy} />
            <Action label="Chat" onPress={() => void openChat()} variant="chat" disabled={actionBusy} />
            <Action label="Interest" onPress={() => void runAction('like')} variant="primary" disabled={actionBusy} />
          </View>
        </View>
      )}

      {isWide && (
        <View style={styles.sideCard}>
          <Text style={styles.kicker}>Private introduction</Text>
          <Text style={styles.sideTitle}>{isPremium ? 'Premium access active' : '90% off Basic'}</Text>
          <Text style={styles.sideCopy}>
            {isPremium
              ? 'Your plan allowances are active across discovery, shortlist, contact, and chat.'
              : 'Eligible new members can unlock the time-limited Basic launch offer.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SmallAction({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallAction, active && styles.smallActionActive, pressed && styles.pressed]}>
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
}

function Action({
  label,
  onPress,
  variant,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant: 'outline' | 'chat' | 'primary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, styles[variant], (pressed || disabled) && styles.pressed]}
    >
      <Text style={[styles.actionText, variant === 'primary' && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: 110,
    alignItems: 'center',
  },
  wideWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    marginTop: spacing.md,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateCopy: {
    marginTop: spacing.sm,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
  },
  sideCard: {
    width: '100%',
    minWidth: 240,
    maxWidth: 310,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadow,
  },
  mobileIntro: {
    maxWidth: 640,
  },
  kicker: {
    color: colors.rose,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  sideTitle: {
    marginTop: spacing.xs,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
  },
  sideCopy: {
    marginTop: spacing.sm,
    color: colors.muted,
    lineHeight: 21,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metric: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.rose,
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 2,
    color: colors.taupe,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  cardShell: {
    width: '100%',
    maxWidth: 540,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    ...shadow,
  },
  cardShellWide: {
    maxWidth: 500,
  },
  photoPanel: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  topActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallAction: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(20,32,51,0.72)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallActionActive: {
    backgroundColor: colors.rose,
    borderColor: colors.rose,
  },
  smallActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  photoIdentity: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  photoName: {
    marginTop: spacing.sm,
    color: colors.white,
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: '700',
  },
  photoLocation: {
    marginTop: spacing.xs,
    color: colors.white,
    fontSize: 15,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
    color: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 11,
    fontWeight: '900',
  },
  badgeDark: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.mocha,
    color: colors.champagneSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 11,
    fontWeight: '900',
  },
  details: {
    padding: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
  },
  id: {
    marginTop: 3,
    color: colors.taupe,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  location: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  info: {
    width: '46%',
  },
  infoLabel: {
    color: colors.taupe,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 3,
    color: colors.ink,
    fontWeight: '700',
    lineHeight: 19,
  },
  about: {
    marginTop: spacing.lg,
    color: colors.muted,
    lineHeight: 21,
  },
  preferenceCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  preferenceTitle: {
    color: colors.ink,
    fontWeight: '900',
  },
  preferenceText: {
    marginTop: 3,
    color: colors.muted,
  },
  matchPill: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.champagneSoft,
    color: colors.mocha,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontWeight: '900',
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  action: {
    minWidth: 82,
    height: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 2,
    borderColor: '#FFB0BF',
    backgroundColor: colors.white,
  },
  chat: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  primary: {
    backgroundColor: colors.rose,
    shadowColor: colors.roseDark,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }],
  },
  actionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryText: {
    color: colors.white,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 540,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.xl,
    ...shadow,
  },
  retryButton: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryText: {
    color: colors.white,
    fontWeight: '900',
  },
});
