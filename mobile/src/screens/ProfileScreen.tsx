import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LuxuryButton } from '../components/LuxuryButton';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { useAuth } from '../contexts/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';

const rows = [
  'Edit Profile',
  'Partner Preferences',
  'Phone Verification',
  'Subscription',
  'Account & Settings',
  'Safety Centre',
  'Help & Support',
];

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Member';

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>My Lovesathi</Text>
      <Text style={styles.title}>Profile Centre</Text>

      <View style={styles.profileCard}>
        <ProfilePhoto initials="F" size={74} />
        <View style={styles.profileText}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.id}>{user?.email || 'Signed in member'}</Text>
        </View>
      </View>

      <View style={styles.offer}>
        <Text style={styles.offerKicker}>Private launch offer</Text>
        <Text style={styles.offerTitle}>90% off Basic</Text>
        <Text style={styles.offerCopy}>
          Available only during the new-profile offer window and refreshed every
          two weeks until purchase.
        </Text>
      </View>

      <View style={styles.menu}>
        {rows.map((row) => (
          <Pressable key={row} style={styles.row}>
            <Text style={styles.rowText}>{row}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <LuxuryButton label="Sign out" onPress={() => void signOut()} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  kicker: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 34,
    fontWeight: '700',
  },
  profileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow,
  },
  profileText: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 24,
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
  offer: {
    borderRadius: radius.lg,
    backgroundColor: colors.rose,
    padding: spacing.lg,
    shadowColor: colors.roseDark,
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  offerKicker: {
    color: colors.blush,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  offerTitle: {
    marginTop: spacing.xs,
    color: colors.white,
    fontFamily: 'Georgia',
    fontSize: 30,
    fontWeight: '700',
  },
  offerCopy: {
    marginTop: spacing.xs,
    color: colors.blush,
    lineHeight: 21,
  },
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadow,
  },
  row: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  chevron: {
    color: colors.taupe,
    fontSize: 28,
  },
});
