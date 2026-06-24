import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { profiles } from '../data/mockProfiles';
import { colors, radius, shadow, spacing } from '../theme';

export function ChatScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Conversations</Text>
      <Text style={styles.title}>Private introductions</Text>
      <Text style={styles.copy}>
        Native chat will connect to the existing Socket.IO service after the
        core screens are migrated.
      </Text>

      <View style={styles.onlineRow}>
        {profiles.map((profile) => (
          <View key={profile.id} style={styles.onlineItem}>
            <ProfilePhoto initials={profile.name.slice(0, 1)} size={52} />
            <View style={styles.onlineDot} />
            <Text style={styles.onlineName}>{profile.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        {profiles.slice(0, 2).map((profile) => (
          <View key={profile.id} style={styles.thread}>
            <ProfilePhoto initials={profile.name.slice(0, 1)} size={56} />
            <View style={styles.threadText}>
              <Text style={styles.threadName}>{profile.name}</Text>
              <Text style={styles.threadPreview}>
                Interest accepted. Start with a respectful introduction.
              </Text>
            </View>
            <Text style={styles.time}>Now</Text>
          </View>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          editable={false}
          placeholder="Realtime messaging coming next"
          placeholderTextColor={colors.taupe}
          style={styles.input}
        />
      </View>
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
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
  onlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  onlineItem: {
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
    marginTop: -12,
    marginLeft: 30,
  },
  onlineName: {
    marginTop: spacing.xs,
    color: colors.ink,
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
  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  threadText: {
    flex: 1,
  },
  threadName: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  threadPreview: {
    marginTop: 3,
    color: colors.muted,
  },
  time: {
    color: colors.champagne,
    fontWeight: '900',
  },
  composer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.sm,
  },
  input: {
    minHeight: 48,
    color: colors.ink,
    paddingHorizontal: spacing.md,
  },
});
