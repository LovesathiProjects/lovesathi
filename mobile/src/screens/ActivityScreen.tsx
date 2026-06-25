import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { useAuth } from '../contexts/AuthContext';
import {
  loadNativeActivity,
  loadNativeShortlist,
  type NativeActivityItem,
  type NativeActivitySnapshot,
} from '../lib/nativeSocialService';
import { colors, radius, shadow, spacing } from '../theme';

type ActivityScreenProps = {
  mode?: 'shortlist';
};

const emptyMetrics: NativeActivitySnapshot['metrics'] = {
  matches: 0,
  todayMatches: 0,
  superLikes: 0,
  views: 0,
  shortlists: 0,
};

export function ActivityScreen({ mode }: ActivityScreenProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<NativeActivityItem[]>([]);
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isShortlist = mode === 'shortlist';

  const title = isShortlist ? 'Saved profiles' : 'Activity ledger';
  const kicker = isShortlist ? 'Shortlist' : 'Lovesathi signals';

  const loadItems = useCallback(async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      if (isShortlist) {
        const shortlist = await loadNativeShortlist(user.id);
        setItems(shortlist);
        setMetrics({
          ...emptyMetrics,
          shortlists: shortlist.length,
        });
        setIsPremium(false);
      } else {
        const snapshot = await loadNativeActivity(user.id);
        setItems(snapshot.items);
        setMetrics(snapshot.metrics);
        setIsPremium(snapshot.isPremium);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isShortlist, user]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  const visibleMetrics = useMemo(() => {
    if (isShortlist) {
      return [
        { value: String(metrics.shortlists), label: 'Saved' },
        { value: '3', label: 'Free limit' },
      ];
    }

    return [
      { value: String(metrics.matches), label: 'Matched' },
      { value: String(metrics.todayMatches), label: 'Today' },
      { value: String(metrics.superLikes), label: 'Super likes' },
      { value: String(metrics.views), label: isPremium ? 'Viewed you' : 'Locked views' },
    ];
  }, [isPremium, isShortlist, metrics]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.rose} size="large" />
        <Text style={styles.stateTitle}>Loading {isShortlist ? 'shortlist' : 'activity'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metrics}>
        {visibleMetrics.map((metric) => (
          <Metric key={metric.label} value={metric.value} label={metric.label} />
        ))}
      </View>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
          <Pressable onPress={() => void loadItems(true)}>
            <Text style={styles.noticeAction}>Retry</Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.stateTitle}>
            {isShortlist ? 'No shortlisted profiles yet' : 'No activity yet'}
          </Text>
          <Text style={styles.stateCopy}>
            {isShortlist
              ? 'Save profiles from Discovery to build your shortlist.'
              : 'Matches, Super Likes, profile views, and shortlist signals will appear here.'}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {items.map((item) => (
            <View key={`${item.type}:${item.id}`} style={styles.row}>
              <ProfilePhoto
                initials={item.masked ? '?' : getInitials(item.name)}
                uri={item.masked ? undefined : item.photo}
                size={52}
              />
              <View style={styles.rowText}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                    {!item.masked && item.age ? `, ${item.age}` : ''}
                  </Text>
                  {item.isNew && <Text style={styles.newPill}>New</Text>}
                </View>
                <Text style={styles.rowMeta} numberOfLines={2}>
                  {item.meta || activityLabel(item)}
                </Text>
              </View>
              <View style={styles.rightMeta}>
                <Text style={[styles.pill, item.type === 'super_like' && styles.goldPill]}>
                  {activityLabel(item)}
                </Text>
                <Text style={styles.time}>{item.timestamp}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function activityLabel(item: NativeActivityItem) {
  if (item.type === 'match') return 'Matched';
  if (item.type === 'super_like') return 'Super Like';
  if (item.type === 'view') return 'Viewed';
  if (item.type === 'shortlist') return 'Saved';
  return 'Liked';
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 110,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    marginTop: spacing.sm,
    color: colors.mocha,
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateCopy: {
    marginTop: spacing.sm,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
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
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowTitle: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  rowMeta: {
    marginTop: 3,
    color: colors.muted,
  },
  rightMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  pill: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
    color: colors.rose,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 11,
    fontWeight: '900',
  },
  goldPill: {
    backgroundColor: colors.champagneSoft,
    color: colors.mocha,
  },
  newPill: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
    color: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '900',
  },
  time: {
    color: colors.champagne,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.xl,
    ...shadow,
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F2B9C7',
    backgroundColor: colors.blush,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeText: {
    color: colors.roseDark,
    fontWeight: '700',
  },
  noticeAction: {
    color: colors.rose,
    fontWeight: '900',
  },
});
