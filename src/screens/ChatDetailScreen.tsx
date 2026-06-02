import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Check, CheckCheck } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { match, otherUser } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5;
  };

  // ── Keyboard listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Fetch + realtime subscriptions ──────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();

    const channel = supabase
      .channel(`match:${match.id}`)
      // New messages from the other person
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${match.id}`,
      }, payload => {
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.new.id);
          if (exists) return prev;
          return [payload.new, ...prev];
        });
        // Mark incoming message as read immediately since chat is open
        if (payload.new.sender_id !== user?.id) {
          supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('id', payload.new.id)
            .then(() => {});
        }
      })
      // Status updates (so sender sees blue ticks in real-time)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${match.id}`,
      }, payload => {
        setMessages(prev =>
          prev.map(m => m.id === payload.new.id ? { ...m, status: payload.new.status } : m)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setMessages(data || []);
      // After loading, mark the other person's messages as read
      markMessagesAsRead();
    }
  };

  // Mark all unread messages from the other user as 'read'
  const markMessagesAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('match_id', match.id)
      .eq('sender_id', otherUser.id)
      .eq('status', 'sent');   // only update ones still at 'sent'

    if (error) {
      console.warn('markMessagesAsRead error:', error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Optimistic update — starts as 'sent'
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      match_id: match.id,
      sender_id: user.id,
      text,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [optimisticMessage, ...prev]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: match.id, sender_id: user.id, text, status: 'sent' })
      .select()
      .single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error(error);
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  // ── Tick component ──────────────────────────────────────────────────────────
  const MessageTick = ({ status, isTemp }: { status: string; isTemp: boolean }) => {
    if (isTemp) {
      // Still sending — single grey
      return <Check size={12} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />;
    }
    if (status === 'read') {
      return <CheckCheck size={12} color="#60CBFF" strokeWidth={2.5} />;
    }
    // 'sent' — single grey tick
    return <Check size={12} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />;
  };

  // ── Message row renderer ────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    const isTemp = item.id?.toString().startsWith('temp-');

    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.text}
          </Text>

          {/* Timestamp + tick row — only on sender's side */}
          {isMe && (
            <View style={styles.metaRow}>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <MessageTick status={item.status} isTemp={isTemp} />
            </View>
          )}
          {/* Timestamp only on receiver side */}
          {!isMe && (
            <Text style={[styles.timeText, { color: 'rgba(0,0,0,0.4)', marginTop: 3, textAlign: 'left' }]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={COLORS.primary} size={28} />
          </TouchableOpacity>
          <Image
            source={{ uri: otherUser.avatar_url || 'https://i.pravatar.cc/150?img=3' }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{otherUser.name || ''}</Text>
            <Text style={[styles.status, !isOnline(otherUser.last_seen) && { color: COLORS.secondary }]}>
              {isOnline(otherUser.last_seen) ? 'Active now' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
        />

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: isKeyboardVisible ? 10 : (insets.bottom || 0) + 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Send color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff' },
  safeArea:       { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton:  { marginRight: 10 },
  avatar:      { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerInfo:  { flex: 1 },
  name:        { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  status:      { fontSize: 12, color: '#6AB04C', fontWeight: '500' },
  messageList: { paddingHorizontal: 15, paddingVertical: 20 },

  messageWrapper: { marginBottom: 10, flexDirection: 'row' },
  myMessageWrapper:    { justifyContent: 'flex-end' },
  theirMessageWrapper: { justifyContent: 'flex-start' },

  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 20,
  },
  myBubble:    { backgroundColor: COLORS.primary, borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: '#F0F0F0', borderBottomLeftRadius: 5 },

  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText:    { color: '#fff' },
  theirMessageText: { color: COLORS.primary },

  // Timestamp + tick row (sender side)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  // Input bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#CCC' },
});
