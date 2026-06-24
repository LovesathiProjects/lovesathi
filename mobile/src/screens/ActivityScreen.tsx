import { StyleSheet, Text, View } from 'react-native';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { profiles } from '../data/mockProfiles';
import { colors, radius, shadow, spacing } from '../theme';

type ActivityScreenProps = {
  mode?: 'shortlist';
};

export function ActivityScreen({ mode }: ActivityScreenProps) {
  const title = mode === 'shortlist' ? 'Saved profiles' : 'Activity ledger';

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Lovesathi signals</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metrics}>
        <Metric value="12" label="Matched" />
        <Metric value="3" label="Today" />
        <Metric value="3" label="Super likes" />
        <Metric value="8" label="Viewed you" />
      </View>

      <View style={styles.card}>
        {profiles.map((profile) => (
          <View key={profile.id} style={styles.row}>
            <ProfilePhoto initials={profile.name.slice(0, 1)} size={52} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{profile.name}</Text>
              <Text style={styles.rowMeta}>
                {profile.city} - {profile.profession}
              </Text>
            </View>
            <Text style={styles.pill}>
              {mode === 'shortlist' ? 'Saved' : 'Matched'}
            </Text>
          </View>
        ))}
      </View>
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
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.md,
    ...shadow,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  rowMeta: {
    marginTop: 3,
    color: colors.muted,
  },
  pill: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
    color: colors.rose,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontWeight: '900',
  },
});
