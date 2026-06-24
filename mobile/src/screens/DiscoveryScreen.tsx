import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { profiles } from '../data/mockProfiles';
import { colors, radius, shadow, spacing } from '../theme';

export function DiscoveryScreen() {
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const profile = profiles[index % profiles.length];

  const nextProfile = () => setIndex((current) => current + 1);

  return (
    <View style={[styles.wrap, isWide && styles.wideWrap]}>
      <View style={styles.sideCard}>
        <Text style={styles.kicker}>Lovesathi matches</Text>
        <Text style={styles.sideTitle}>Curated discovery</Text>
        <Text style={styles.sideCopy}>
          Review one serious introduction at a time with premium-safe contact
          controls and compatibility signals.
        </Text>
        <View style={styles.metricRow}>
          <Metric value="241" label="Profiles" />
          <Metric value="3" label="Free chats" />
        </View>
      </View>

      <View style={styles.cardShell}>
        <LinearGradient
          colors={[colors.champagneSoft, '#D7C29E', colors.ink]}
          style={styles.photoPanel}
        >
          <ProfilePhoto initials={profile.name.slice(0, 2).toUpperCase()} size={132} />
          <View style={styles.badges}>
            {profile.verified && <Text style={styles.badge}>Verified</Text>}
            {profile.premium && <Text style={styles.badgeDark}>Premium</Text>}
          </View>
        </LinearGradient>

        <View style={styles.details}>
          <Text style={styles.name}>
            {profile.name}, {profile.age}
          </Text>
          <Text style={styles.id}>ID - {profile.id}</Text>
          <Text style={styles.location}>
            {profile.city}, {profile.state} - {profile.height}
          </Text>
          <View style={styles.infoGrid}>
            <Info label="Community" value={profile.community} />
            <Info label="Profession" value={profile.profession} />
            <Info label="Education" value={profile.education} />
            <Info label="Income" value={profile.income} />
          </View>
          <Text style={styles.about}>{profile.about}</Text>
        </View>

        <View style={styles.preferenceCard}>
          <View>
            <Text style={styles.preferenceTitle}>Her preference</Text>
            <Text style={styles.preferenceText}>You match {profile.matchScore}%</Text>
          </View>
          <Text style={styles.matchPill}>Strong fit</Text>
        </View>

        <View style={styles.actions}>
          <Action label="X" onPress={nextProfile} variant="outline" />
          <Action label="Chat" onPress={() => {}} variant="chat" />
          <Action label="Heart" onPress={nextProfile} variant="primary" />
        </View>
      </View>

      {isWide && (
        <View style={styles.sideCard}>
          <Text style={styles.kicker}>Launch offer</Text>
          <Text style={styles.sideTitle}>90% off Basic</Text>
          <Text style={styles.sideCopy}>
            New members can use a private Basic-plan launch discount during the
            active offer window.
          </Text>
        </View>
      )}
    </View>
  );
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
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Action({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: 'outline' | 'chat' | 'primary';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        styles[variant],
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, variant === 'primary' && styles.primaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  wideWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: 330,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadow,
  },
  kicker: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
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
    lineHeight: 22,
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
    fontSize: 26,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 2,
    color: colors.taupe,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardShell: {
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    ...shadow,
  },
  photoPanel: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
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
    fontSize: 12,
    fontWeight: '800',
  },
  badgeDark: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    color: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    padding: spacing.lg,
  },
  name: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  id: {
    marginTop: 4,
    color: colors.taupe,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  location: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  info: {
    width: '47%',
  },
  infoLabel: {
    color: colors.taupe,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 3,
    color: colors.ink,
    fontWeight: '700',
  },
  about: {
    marginTop: spacing.md,
    color: colors.muted,
    lineHeight: 22,
  },
  preferenceCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  actionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryText: {
    color: colors.white,
  },
});
