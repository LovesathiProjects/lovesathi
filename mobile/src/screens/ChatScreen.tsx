import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { useAuth } from '../contexts/AuthContext';
import {
  loadNativeChats,
  loadNativeMessages,
  sendNativeMessage,
  subscribeToNativeMessages,
  type NativeChatPreview,
  type NativeMessage,
} from '../lib/nativeSocialService';
import { colors, radius, shadow, spacing } from '../theme';
import type { MainTabParamList } from '../navigation/types';

type ChatRoute = RouteProp<MainTabParamList, 'Chat'>;

export function ChatScreen() {
  const { user } = useAuth();
  const route = useRoute<ChatRoute>();
  const requestedMatchId = route.params?.matchId;
  const [chats, setChats] = useState<NativeChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<NativeChatPreview | null>(null);
  const [messages, setMessages] = useState<NativeMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyChatPreview = useCallback((message: NativeMessage) => {
    setChats((current) => {
      const next = current.map((chat) => {
        if (chat.matchId !== message.match_id) return chat;
        return {
          ...chat,
          lastMessage: message.content,
          lastMessageAt: message.created_at,
          unreadCount:
            user && message.receiver_id === user.id
              ? chat.unreadCount + 1
              : chat.unreadCount,
        };
      });
      return next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    });
    setSelectedChat((current) => {
      if (!current || current.matchId !== message.match_id) return current;
      return {
        ...current,
        lastMessage: message.content,
        lastMessageAt: message.created_at,
      };
    });
  }, [user]);

  const loadChats = useCallback(async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const nextChats = await loadNativeChats(user.id);
      setChats(nextChats);
      setSelectedChat((current) => {
        if (!current) return null;
        return nextChats.find((chat) => chat.matchId === current.matchId) ?? current;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadChats();
    }, [loadChats]),
  );

  useEffect(() => {
    if (!requestedMatchId || !chats.length) return;
    const requestedChat = chats.find((chat) => chat.matchId === requestedMatchId);
    if (requestedChat) setSelectedChat(requestedChat);
  }, [chats, requestedMatchId]);

  useEffect(() => {
    if (!selectedChat || !user) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    setMessageLoading(true);

    loadNativeMessages(selectedChat.matchId, user.id)
      .then((loadedMessages) => {
        if (active) setMessages(loadedMessages);
      })
      .catch((loadError) => {
        if (active) {
          Alert.alert(
            'Could not load chat',
            loadError instanceof Error ? loadError.message : 'Please try again.',
          );
        }
      })
      .finally(() => {
        if (active) setMessageLoading(false);
      });

    const unsubscribe = subscribeToNativeMessages(selectedChat.matchId, {
      onInsert: (message) => {
        if (message.sender_id !== user.id && message.receiver_id !== user.id) return;
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) return current;
          return [...current, message];
        });
        applyChatPreview(message);
      },
      onUpdate: (message) => {
        setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
        applyChatPreview(message);
      },
      onDelete: (messageId) => {
        setMessages((current) => current.filter((message) => message.id !== messageId));
      },
      onError: (subscriptionError) => {
        console.warn(subscriptionError.message);
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyChatPreview, selectedChat?.matchId, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!user || !selectedChat || sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    try {
      const sentMessage = await sendNativeMessage({
        matchId: selectedChat.matchId,
        senderId: user.id,
        receiverId: selectedChat.otherUserId,
        content,
      });
      setDraft('');
      setMessages((current) => {
        if (current.some((message) => message.id === sentMessage.id)) return current;
        return [...current, sentMessage];
      });
      applyChatPreview(sentMessage);
    } catch (sendError) {
      Alert.alert(
        /limit|upgrade|contact/i.test(sendError instanceof Error ? sendError.message : '')
          ? 'Message not sent'
          : 'Could not send message',
        sendError instanceof Error ? sendError.message : 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  }, [applyChatPreview, draft, selectedChat, sending, user]);

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) => !user || !Array.isArray(message.deleted_by) || !message.deleted_by.includes(user.id),
      ),
    [messages, user],
  );

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.rose} size="large" />
        <Text style={styles.stateTitle}>Loading conversations</Text>
      </View>
    );
  }

  if (selectedChat) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
        style={styles.chatShell}
      >
        <View style={styles.chatHeader}>
          <Pressable style={styles.backButton} onPress={() => setSelectedChat(null)}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <ProfilePhoto initials={getInitials(selectedChat.name)} uri={selectedChat.photo} size={46} />
          <View style={styles.chatHeaderText}>
            <Text style={styles.threadName} numberOfLines={1}>{selectedChat.name}</Text>
            <Text style={styles.threadPreview} numberOfLines={1}>
              {selectedChat.isPremium ? 'Premium member' : 'Lovesathi match'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messageLoading ? (
            <View style={styles.messageState}>
              <ActivityIndicator color={colors.rose} />
            </View>
          ) : visibleMessages.length === 0 ? (
            <View style={styles.messageState}>
              <Text style={styles.stateTitle}>Start with intention</Text>
              <Text style={styles.stateCopy}>Send a respectful first message. Contact details are blocked in chat.</Text>
            </View>
          ) : (
            visibleMessages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <View key={message.id} style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
                  <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                    <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{message.content}</Text>
                    <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
                      {formatTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a respectful message"
            placeholderTextColor={colors.taupe}
            style={styles.input}
            multiline
            editable={!sending}
          />
          <Pressable
            disabled={!draft.trim() || sending}
            onPress={() => void sendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              (!draft.trim() || sending || pressed) && styles.pressed,
            ]}
          >
            <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadChats(true)} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>Conversations</Text>
      <Text style={styles.title}>Private introductions</Text>
      <Text style={styles.copy}>Matches and direct discovery chats appear here in real time.</Text>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
          <Pressable onPress={() => void loadChats(true)}>
            <Text style={styles.noticeAction}>Retry</Text>
          </Pressable>
        </View>
      )}

      {chats.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.stateTitle}>No conversations yet</Text>
          <Text style={styles.stateCopy}>Send interest or open a starter chat from Discovery to begin.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {chats.map((chat) => (
            <Pressable
              key={chat.matchId}
              onPress={() => setSelectedChat(chat)}
              style={({ pressed }) => [styles.thread, pressed && styles.pressed]}
            >
              <ProfilePhoto initials={getInitials(chat.name)} uri={chat.photo} size={56} />
              <View style={styles.threadText}>
                <View style={styles.threadTitleRow}>
                  <Text style={styles.threadName} numberOfLines={1}>{chat.name}</Text>
                  {chat.isPremium && <Text style={styles.premiumPill}>Premium</Text>}
                </View>
                <Text style={styles.threadPreview} numberOfLines={1}>{chat.lastMessage}</Text>
              </View>
              <View style={styles.threadMeta}>
                <Text style={styles.time}>{relativeTime(chat.lastMessageAt)}</Text>
                {chat.unreadCount > 0 && <Text style={styles.unread}>{chat.unreadCount}</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
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

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function relativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(timestamp).toLocaleDateString();
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 110,
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
    minWidth: 0,
  },
  threadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  threadName: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  threadPreview: {
    marginTop: 3,
    color: colors.muted,
  },
  threadMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  time: {
    color: colors.champagne,
    fontWeight: '900',
  },
  unread: {
    minWidth: 22,
    overflow: 'hidden',
    borderRadius: 11,
    backgroundColor: colors.rose,
    color: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
  },
  premiumPill: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.blush,
    color: colors.rose,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: 10,
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
  chatShell: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  backButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    color: colors.ink,
    fontWeight: '900',
  },
  chatHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  messageList: {
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  messageState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    borderBottomRightRadius: 6,
    borderColor: colors.rose,
    backgroundColor: colors.rose,
  },
  bubbleOther: {
    borderBottomLeftRadius: 6,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  messageText: {
    color: colors.ink,
    lineHeight: 21,
  },
  messageTextOwn: {
    color: colors.white,
  },
  messageTime: {
    marginTop: spacing.xs,
    color: colors.taupe,
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '700',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.82)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.rose,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: colors.white,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.65,
  },
});
