import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5;
  };

  // Refetch whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [user])
  );

  // Real-time: refresh list on new match OR new message
  useEffect(() => {
    const channel = supabase
      .channel('chat_list_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        // Silently refresh so last message + unread count update
        fetchMatches();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        // Also refresh when a message is marked as read (removes unread badge)
        fetchMatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        compatibility_score,
        is_unlocked,
        created_at,
        user1:user1_id ( id, name, avatar_url, anonymous_id, last_seen ),
        user2:user2_id ( id, name, avatar_url, anonymous_id, last_seen )
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // For each match, fetch the latest message + unread count
    const enriched = await Promise.all(
      (data || []).map(async (m) => {
        const otherUser = m.user1_id === user.id ? m.user2 : m.user1;

        // Latest message in this match
        const { data: msgs } = await supabase
          .from('messages')
          .select('text, created_at, sender_id, status')
          .eq('match_id', m.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0] ?? null;

        // Unread count: messages sent by other person that are still 'sent'
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', m.id)
          .eq('sender_id', otherUser.id)
          .eq('status', 'sent');

        return {
          ...m,
          otherUser,
          lastMessage: lastMsg,
          unreadCount: count ?? 0,
        };
      })
    );

    // Sort: conversations with unread messages first, then by latest message time
    enriched.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const aTime = a.lastMessage?.created_at ?? a.created_at;
      const bTime = b.lastMessage?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setMatches(enriched);
    setLoading(false);
    setRefreshing(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / 3600000;

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // ── Active sparks (top horizontal scroll) ────────────────────────────────────
  const renderActiveMatch = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.activeAvatarContainer}
      onPress={() => navigation.navigate('ChatDetail', { match: item, otherUser: item.otherUser })}
    >
      <Image
        source={{ uri: item.otherUser.avatar_url || 'https://i.pravatar.cc/150?img=3' }}
        style={[
          styles.activeAvatar,
          item.unreadCount > 0 && styles.activeAvatarUnread,
        ]}
      />
      <View style={[styles.onlineDot, { backgroundColor: isOnline(item.otherUser.last_seen) ? '#6AB04C' : COLORS.secondary }]}>
        <Text style={{ color: COLORS.white, fontSize: 8, fontWeight: 'bold' }}>{item.compatibility_score}%</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Main chat list row ────────────────────────────────────────────────────────
  const renderChatItem = ({ item }: { item: any }) => {
    const hasUnread = item.unreadCount > 0;
    const isMyMessage = item.lastMessage?.sender_id === user?.id;

    let preview = 'You sparked a connection! 🔥';
    if (item.lastMessage) {
      preview = isMyMessage
        ? `You: ${item.lastMessage.text}`
        : item.lastMessage.text;
    }

    const timeLabel = item.lastMessage
      ? formatTime(item.lastMessage.created_at)
      : isOnline(item.otherUser.last_seen) ? 'Active now' : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatDetail', { match: item, otherUser: item.otherUser })}
        activeOpacity={0.75}
      >
        {/* Avatar with optional unread ring */}
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: item.otherUser.avatar_url || 'https://i.pravatar.cc/150?img=12' }}
            style={[styles.chatAvatar, hasUnread && styles.chatAvatarUnread]}
          />
          {isOnline(item.otherUser.last_seen) && <View style={styles.onlineIndicator} />}
        </View>

        {/* Text content */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>
              {item.otherUser.name}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
              {timeLabel}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <Text
              style={[styles.chatLastMessage, hasUnread && styles.chatLastMessageUnread]}
              numberOfLines={1}
            >
              {preview}
            </Text>

            {/* Unread badge */}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
        </View>

        <View style={styles.contentContainer}>
          {matches.length > 0 ? (
            <FlatList
              data={matches}
              keyExtractor={item => item.id.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); fetchMatches(); }}
                  tintColor={COLORS.primary}
                />
              }
              ListHeaderComponent={
                <View style={{ marginBottom: 25 }}>
                  <Text style={styles.sectionTitle}>Active Sparks</Text>
                  <FlatList
                    data={matches}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => `active-${item.id}`}
                    renderItem={renderActiveMatch}
                    contentContainerStyle={{ paddingHorizontal: SIZES.padding }}
                  />
                </View>
              }
              renderItem={renderChatItem}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Text style={{ textAlign: 'center', color: COLORS.secondary }}>
                No matches yet. Start swiping to spark a connection!
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  safeArea:         { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  scrollContent:  { paddingTop: 20, paddingBottom: 100 },
  sectionTitle:   { fontSize: 14, color: COLORS.secondary, paddingHorizontal: SIZES.padding, marginBottom: 15 },

  // Active sparks
  activeAvatarContainer: { marginRight: 15, position: 'relative' },
  activeAvatar:          { width: 65, height: 65, borderRadius: 32.5 },
  activeAvatarUnread:    { borderWidth: 2.5, borderColor: COLORS.notification },
  onlineDot: {
    position: 'absolute', right: 0, bottom: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.notification,
    borderWidth: 2, borderColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
  },

  // Chat list row
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: SIZES.padding,
  },
  avatarWrap:        { position: 'relative', marginRight: 15 },
  chatAvatar:        { width: 56, height: 56, borderRadius: 28 },
  chatAvatarUnread:  { borderWidth: 2.5, borderColor: COLORS.notification },
  onlineIndicator:   {
    position: 'absolute', right: 2, bottom: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#6AB04C',
    borderWidth: 2, borderColor: COLORS.white,
  },

  chatInfo:          { flex: 1 },
  chatHeader:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName:          { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  chatNameUnread:    { fontWeight: '800' },
  chatTime:          { fontSize: 12, color: COLORS.secondary },
  chatTimeUnread:    { color: COLORS.notification, fontWeight: '700' },

  chatFooter:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLastMessage:   { fontSize: 14, color: COLORS.secondary, flex: 1, marginRight: 8 },
  chatLastMessageUnread: { color: COLORS.primary, fontWeight: '700' },

  // Unread badge (blue dot with count)
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.notification,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
});
