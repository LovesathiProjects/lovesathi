import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  CONTACT_SHARING_BLOCKED_MESSAGE,
  containsShareableNumber,
} from './contactSafety';
import { supabase } from './supabase';

const MATCH_TYPE = 'matrimony' as const;

export type NativeMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  reply_to_message_id: string | null;
  deleted_by: string[];
  created_at: string;
  delivered_at: string | null;
  seen_at: string | null;
  status: 'sent' | 'delivered' | 'seen';
  delivered_to: string[];
  seen_by: string[];
  match_type: typeof MATCH_TYPE;
};

export type NativeChatPreview = {
  matchId: string;
  matchType: typeof MATCH_TYPE;
  otherUserId: string;
  name: string;
  photo?: string;
  lastMessage: string;
  lastMessageAt: string;
  matchedAt: string;
  unreadCount: number;
  isPremium: boolean;
};

export type NativeChatPresence = {
  userId: string;
  lastSeenAt: string;
};

export const NATIVE_CHAT_PRESENCE_HEARTBEAT_MS = 45_000;
export const NATIVE_CHAT_PRESENCE_ONLINE_WINDOW_MS = 2 * 60_000;

export type NativeActivityType = 'match' | 'like' | 'super_like' | 'view' | 'shortlist';

export type NativeActivityItem = {
  id: string;
  type: NativeActivityType;
  userId: string;
  name: string;
  photo?: string;
  age?: number;
  meta: string;
  occurredAt: string;
  timestamp: string;
  isNew: boolean;
  masked?: boolean;
};

export type NativeActivitySnapshot = {
  items: NativeActivityItem[];
  metrics: {
    matches: number;
    todayMatches: number;
    superLikes: number;
    views: number;
    shortlists: number;
  };
  isPremium: boolean;
};

type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at?: string | null;
  is_active?: boolean | null;
  archived_by?: string[] | null;
};

type ProfileRow = {
  user_id: string;
  name?: string | null;
  age?: number | null;
  photos?: unknown;
  personal?: unknown;
  career?: unknown;
  cultural?: unknown;
};

type LikeRow = {
  id: string;
  liker_id: string;
  liked_id?: string;
  action: 'like' | 'connect' | 'super_like' | 'pass';
  created_at: string;
};

type ViewRow = {
  id: string;
  viewer_id: string;
  viewed_at: string;
};

type ShortlistRow = {
  id?: string;
  shortlisted_user_id: string;
  created_at: string;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured for the mobile app.');
  }
  return supabase;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function presenceUnavailable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST202' ||
    /lovesathi_chat_presence|touch_lovesathi_chat_presence|does not exist/i.test(error?.message ?? '')
  );
}

function mapChatPresence(value: unknown): NativeChatPresence | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as { user_id?: unknown; last_seen_at?: unknown };
  if (typeof row.user_id !== 'string' || typeof row.last_seen_at !== 'string') return null;

  return { userId: row.user_id, lastSeenAt: row.last_seen_at };
}

function safePhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (photo): photo is string =>
      typeof photo === 'string' && /^https?:\/\//i.test(photo.trim()),
  );
}

function mapProfileMeta(row?: ProfileRow) {
  if (!row) {
    return {
      name: 'Lovesathi member',
      photo: undefined,
      age: undefined,
      meta: 'Private profile',
    };
  }

  const personal = objectValue(row.personal);
  const career = objectValue(row.career);
  const cultural = objectValue(row.cultural);
  const workLocation = objectValue(career.work_location);
  const location = [workLocation.city, workLocation.state, workLocation.country]
    .map((part) => textValue(part))
    .filter(Boolean)
    .join(', ');
  const profession = textValue(career.job_title);
  const community = textValue(cultural.community);
  const height = personal.height_cm ? `${personal.height_cm} cm` : '';

  return {
    name: textValue(row.name, 'Lovesathi member'),
    photo: safePhotos(row.photos)[0],
    age: typeof row.age === 'number' ? row.age : undefined,
    meta: [location, profession, community, height].filter(Boolean).slice(0, 2).join(' - '),
  };
}

function otherUserId(match: MatchRow, userId: string) {
  return match.user1_id === userId ? match.user2_id : match.user1_id;
}

function isDeletedForUser(message: Pick<NativeMessage, 'deleted_by'>, userId: string) {
  return Array.isArray(message.deleted_by) && message.deleted_by.includes(userId);
}

function relativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function normalizeSocialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Something went wrong.');
  const lower = message.toLowerCase();

  if (lower.includes('contact details cannot') || lower.includes('contact number')) {
    return CONTACT_SHARING_BLOCKED_MESSAGE;
  }
  if (lower.includes('free starter direct chat includes one message')) {
    return 'Free starter direct chat includes one message per profile. Upgrade for unlimited chat.';
  }
  if (lower.includes('direct chat limit') || lower.includes('starter chats')) {
    return 'Free plan direct chat limit reached. You can open 3 starter chats with free profiles and send 1 message to each. Upgrade for unlimited chat.';
  }
  if (lower.includes('available only with free profiles')) {
    return 'Free starter direct chat is available only with free profiles. Upgrade to chat directly with premium profiles.';
  }
  if (lower.includes('shortlist limit')) {
    return 'Free plan shortlist limit reached. You can save 3 profiles. Upgrade for more shortlist space.';
  }
  if (lower.includes('super like')) {
    return 'Free plan Super Like limit reached. You can send 3 Super Likes each month. Upgrade for more standout interests.';
  }

  return message;
}

async function isPremiumMember(userId: string) {
  const { data, error } = await requireClient().rpc('is_lovesathi_premium', {
    p_user_id: userId,
  });
  if (error) return false;
  return Boolean(data);
}

async function loadProfilesByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, ProfileRow>();

  const { data, error } = await requireClient()
    .from('matrimony_profile_full')
    .select('user_id,name,age,photos,personal,career,cultural')
    .in('user_id', userIds);

  if (error) throw error;
  return new Map(((data ?? []) as ProfileRow[]).map((row) => [row.user_id, row]));
}

async function loadPremiumIds(userIds: string[]) {
  if (!userIds.length) return new Set<string>();

  const { data, error } = await requireClient().rpc('get_lovesathi_premium_profile_ids', {
    p_user_ids: userIds,
  });

  if (error) return new Set<string>();
  return new Set((data as string[] | null) ?? []);
}

async function getRecentSenderMessageContents(
  matchId: string,
  senderId: string,
  receiverId: string,
) {
  const { data, error } = await requireClient()
    .from('messages')
    .select('content,created_at')
    .eq('match_id', matchId)
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) return [];

  return (data ?? [])
    .slice()
    .reverse()
    .map((message) => textValue(message.content));
}

async function assertFreeDirectMessageAllowed(
  matchId: string,
  senderId: string,
  receiverId: string,
) {
  if (await isPremiumMember(senderId)) return;

  const { data: starterChat, error } = await requireClient()
    .from('lovesathi_free_direct_chats')
    .select('created_at,match_id')
    .eq('initiator_id', senderId)
    .eq('recipient_id', receiverId)
    .maybeSingle();

  if (error || !starterChat) return;

  const createdAt = textValue(starterChat.created_at);
  const { count, error: countError } = await requireClient()
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .gte('created_at', createdAt);

  if (!countError && (count ?? 0) >= 1) {
    throw new Error('Free starter direct chat includes one message per profile. Upgrade for unlimited chat.');
  }
}

export async function createNativeDirectChat(targetUserId: string) {
  try {
    const { data, error } = await requireClient().rpc('create_lovesathi_premium_direct_match', {
      p_other_user_id: targetUserId,
    });
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('Unable to create chat.');
    const { error: unarchiveError } = await requireClient().rpc(
      'unarchive_lovesathi_match_for_user',
      {
        p_match_id: data,
      },
    );
    if (unarchiveError) {
      console.warn('[createNativeDirectChat] Unable to unarchive chat:', unarchiveError.message);
    }
    return data;
  } catch (error) {
    throw new Error(normalizeSocialError(error));
  }
}

export async function loadNativeChats(userId: string): Promise<NativeChatPreview[]> {
  const client = requireClient();
  const { data: matches, error } = await client
    .from('matrimony_matches')
    .select('id,user1_id,user2_id,matched_at,is_active,archived_by')
    .eq('is_active', true)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('matched_at', { ascending: false });

  if (error) throw error;

  const matchRows = ((matches ?? []) as MatchRow[]).filter(
    (match) => !Array.isArray(match.archived_by) || !match.archived_by.includes(userId),
  );
  if (!matchRows.length) return [];

  const matchIds = matchRows.map((match) => match.id);
  const otherIds = Array.from(new Set(matchRows.map((match) => otherUserId(match, userId))));
  const [profileMap, premiumIds, messagesResult, unreadResult] = await Promise.all([
    loadProfilesByIds(otherIds),
    loadPremiumIds(otherIds),
    client
      .from('messages')
      .select('*')
      .in('match_id', matchIds)
      .eq('match_type', MATCH_TYPE)
      .order('created_at', { ascending: false }),
    client
      .from('messages')
      .select('match_id,deleted_by')
      .in('match_id', matchIds)
      .eq('receiver_id', userId)
      .is('seen_at', null),
  ]);

  if (messagesResult.error) throw messagesResult.error;
  if (unreadResult.error) throw unreadResult.error;

  const lastMessageByMatch = new Map<string, NativeMessage>();
  for (const message of (messagesResult.data ?? []) as NativeMessage[]) {
    if (isDeletedForUser(message, userId)) continue;
    if (!lastMessageByMatch.has(message.match_id)) {
      lastMessageByMatch.set(message.match_id, message);
    }
  }

  const unreadByMatch = new Map<string, number>();
  for (const row of (unreadResult.data ?? []) as Array<{ match_id: string; deleted_by?: string[] }>) {
    if (Array.isArray(row.deleted_by) && row.deleted_by.includes(userId)) continue;
    unreadByMatch.set(row.match_id, (unreadByMatch.get(row.match_id) ?? 0) + 1);
  }

  return matchRows
    .map((match) => {
      const peerId = otherUserId(match, userId);
      const profile = mapProfileMeta(profileMap.get(peerId));
      const lastMessage = lastMessageByMatch.get(match.id);
      const fallbackTime = match.matched_at ?? new Date().toISOString();

      return {
        matchId: match.id,
        matchType: MATCH_TYPE,
        otherUserId: peerId,
        name: profile.name,
        photo: profile.photo,
        lastMessage: lastMessage?.content || 'You matched. Start a respectful introduction.',
        lastMessageAt: lastMessage?.created_at || fallbackTime,
        matchedAt: fallbackTime,
        unreadCount: unreadByMatch.get(match.id) ?? 0,
        isPremium: premiumIds.has(peerId),
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function loadNativeMessages(
  matchId: string,
  userId: string,
): Promise<NativeMessage[]> {
  const { data, error } = await requireClient()
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .eq('match_type', MATCH_TYPE)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as NativeMessage[]).filter((message) => !isDeletedForUser(message, userId));
}

export async function sendNativeMessage(input: {
  matchId: string;
  senderId: string;
  receiverId: string;
  content: string;
}) {
  try {
    const content = input.content.trim();
    if (!content) throw new Error('Message content cannot be empty.');

    if (containsShareableNumber(content)) {
      throw new Error(CONTACT_SHARING_BLOCKED_MESSAGE);
    }

    const recentMessages = await getRecentSenderMessageContents(
      input.matchId,
      input.senderId,
      input.receiverId,
    );
    if (containsShareableNumber(content, recentMessages)) {
      throw new Error(CONTACT_SHARING_BLOCKED_MESSAGE);
    }

    await assertFreeDirectMessageAllowed(input.matchId, input.senderId, input.receiverId);

    const { data, error } = await requireClient()
      .from('messages')
      .insert({
        match_id: input.matchId,
        sender_id: input.senderId,
        receiver_id: input.receiverId,
        content,
        match_type: MATCH_TYPE,
        status: 'sent',
      })
      .select()
      .single();

    if (error) throw error;
    return data as NativeMessage;
  } catch (error) {
    throw new Error(normalizeSocialError(error));
  }
}

export function subscribeToNativeMessages(
  matchId: string,
  callbacks: {
    onInsert?: (message: NativeMessage) => void;
    onUpdate?: (message: NativeMessage) => void;
    onDelete?: (messageId: string) => void;
    onError?: (error: Error) => void;
  },
) {
  const client = requireClient();
  let channel: RealtimeChannel | null = client
    .channel(`native-messages:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const message = payload.new as NativeMessage;
        if (message.match_type === MATCH_TYPE) callbacks.onInsert?.(message);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const message = payload.new as NativeMessage;
        if (message.match_type === MATCH_TYPE) callbacks.onUpdate?.(message);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const oldMessage = payload.old as Partial<NativeMessage>;
        if (oldMessage.match_id === matchId && oldMessage.id) callbacks.onDelete?.(oldMessage.id);
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        callbacks.onError?.(new Error('Realtime message subscription failed.'));
      }
    });

  return () => {
    if (channel) {
      void client.removeChannel(channel);
      channel = null;
    }
  };
}

export async function touchNativeChatPresence() {
  const { data, error } = await requireClient().rpc('touch_lovesathi_chat_presence');

  if (error) {
    if (!presenceUnavailable(error)) {
      console.warn('[touchNativeChatPresence] Unable to update presence:', error.message);
    }
    return null;
  }

  return typeof data === 'string' ? data : null;
}

export async function loadNativeChatPresence(userId: string): Promise<NativeChatPresence | null> {
  const { data, error } = await requireClient()
    .from('lovesathi_chat_presence')
    .select('user_id,last_seen_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (!presenceUnavailable(error)) {
      console.warn('[loadNativeChatPresence] Unable to read presence:', error.message);
    }
    return null;
  }

  return mapChatPresence(data);
}

export function subscribeToNativeChatPresence(
  userId: string,
  callbacks: {
    onChange?: (presence: NativeChatPresence) => void;
    onError?: (error: Error) => void;
  },
) {
  const client = requireClient();
  let channel: RealtimeChannel | null = client
    .channel(`native-chat-presence:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'lovesathi_chat_presence',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const presence = mapChatPresence(payload.new);
        if (presence) callbacks.onChange?.(presence);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lovesathi_chat_presence',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const presence = mapChatPresence(payload.new);
        if (presence) callbacks.onChange?.(presence);
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        callbacks.onError?.(new Error('Realtime chat presence subscription failed.'));
      }
    });

  return () => {
    if (channel) {
      void client.removeChannel(channel);
      channel = null;
    }
  };
}

export function getNativeChatPresenceStatus(lastSeenAt?: string | null, now = Date.now()) {
  if (!lastSeenAt) return { isOnline: false, label: '' };

  const lastSeenMs = Date.parse(lastSeenAt);
  if (!Number.isFinite(lastSeenMs)) return { isOnline: false, label: '' };

  const elapsedMs = Math.max(0, now - lastSeenMs);
  if (elapsedMs <= NATIVE_CHAT_PRESENCE_ONLINE_WINDOW_MS) {
    return { isOnline: true, label: 'Online now' };
  }

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 60) return { isOnline: false, label: `Last seen ${elapsedMinutes}m ago` };

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return { isOnline: false, label: `Last seen ${elapsedHours}h ago` };

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return { isOnline: false, label: 'Last seen yesterday' };
  if (elapsedDays < 7) return { isOnline: false, label: `Last seen ${elapsedDays}d ago` };

  return {
    isOnline: false,
    label: `Last seen ${new Date(lastSeenMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
  };
}

export async function loadNativeActivity(userId: string): Promise<NativeActivitySnapshot> {
  const client = requireClient();
  const [matchesResult, likesResult, viewsResult, shortlistCountResult, isPremium] =
    await Promise.all([
      client
        .from('matrimony_matches')
        .select('id,user1_id,user2_id,matched_at,is_active,archived_by')
        .eq('is_active', true)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('matched_at', { ascending: false }),
      client
        .from('matrimony_likes')
        .select('id,liker_id,liked_id,action,created_at')
        .eq('liked_id', userId)
        .in('action', ['like', 'connect', 'super_like'])
        .order('created_at', { ascending: false }),
      client
        .from('matrimony_profile_views')
        .select('id,viewer_id,viewed_at')
        .eq('viewed_user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(100),
      client
        .from('shortlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      isPremiumMember(userId),
    ]);

  if (matchesResult.error) throw matchesResult.error;
  if (likesResult.error) throw likesResult.error;
  if (viewsResult.error) throw viewsResult.error;

  const matches = ((matchesResult.data ?? []) as MatchRow[]).filter(
    (match) => !Array.isArray(match.archived_by) || !match.archived_by.includes(userId),
  );
  const likes = (likesResult.data ?? []) as LikeRow[];
  const views = (viewsResult.data ?? []) as ViewRow[];
  const userIds = Array.from(
    new Set([
      ...matches.map((match) => otherUserId(match, userId)),
      ...likes.map((like) => like.liker_id),
      ...views.map((view) => view.viewer_id),
    ]),
  );
  const profileMap = await loadProfilesByIds(userIds);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const items: NativeActivityItem[] = [
    ...matches.map((match) => {
      const peerId = otherUserId(match, userId);
      const profile = mapProfileMeta(profileMap.get(peerId));
      const occurredAt = match.matched_at ?? new Date().toISOString();

      return {
        id: match.id,
        type: 'match' as const,
        userId: peerId,
        name: profile.name,
        photo: profile.photo,
        age: profile.age,
        meta: 'You matched',
        occurredAt,
        timestamp: relativeTime(occurredAt),
        isNew: new Date(occurredAt).getTime() > oneDayAgo,
      };
    }),
    ...likes.map((like) => {
      const profile = mapProfileMeta(profileMap.get(like.liker_id));
      const type: NativeActivityType = like.action === 'super_like' ? 'super_like' : 'like';

      return {
        id: like.id,
        type,
        userId: like.liker_id,
        name: profile.name,
        photo: profile.photo,
        age: profile.age,
        meta: type === 'super_like' ? 'Sent you a Super Like' : 'Liked your profile',
        occurredAt: like.created_at,
        timestamp: relativeTime(like.created_at),
        isNew: new Date(like.created_at).getTime() > oneDayAgo,
      };
    }),
    ...views.map((view) => {
      const profile = mapProfileMeta(profileMap.get(view.viewer_id));
      const masked = !isPremium;

      return {
        id: view.id,
        type: 'view' as const,
        userId: view.viewer_id,
        name: masked ? 'Premium viewer' : profile.name,
        photo: masked ? undefined : profile.photo,
        age: masked ? undefined : profile.age,
        meta: masked ? 'Viewed your profile. Upgrade to reveal.' : 'Viewed your profile',
        occurredAt: view.viewed_at,
        timestamp: relativeTime(view.viewed_at),
        isNew: new Date(view.viewed_at).getTime() > oneDayAgo,
        masked,
      };
    }),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return {
    items,
    metrics: {
      matches: matches.length,
      todayMatches: matches.filter((match) => isToday(match.matched_at ?? '')).length,
      superLikes: likes.filter((like) => like.action === 'super_like').length,
      views: views.length,
      shortlists: shortlistCountResult.count ?? 0,
    },
    isPremium,
  };
}

export async function loadNativeShortlist(userId: string): Promise<NativeActivityItem[]> {
  const { data, error } = await requireClient()
    .from('shortlists')
    .select('id,shortlisted_user_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as ShortlistRow[];
  if (!rows.length) return [];

  const profileMap = await loadProfilesByIds(rows.map((row) => row.shortlisted_user_id));

  return rows.map((row) => {
    const profile = mapProfileMeta(profileMap.get(row.shortlisted_user_id));

    return {
      id: row.id ?? `${userId}:${row.shortlisted_user_id}`,
      type: 'shortlist',
      userId: row.shortlisted_user_id,
      name: profile.name,
      photo: profile.photo,
      age: profile.age,
      meta: profile.meta || 'Saved profile',
      occurredAt: row.created_at,
      timestamp: relativeTime(row.created_at),
      isNew: false,
    };
  });
}
