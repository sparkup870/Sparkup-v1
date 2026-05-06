import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS, SIZES } from '../constants/theme';

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const { match, otherUser } = route.params;
  const insets = useSafeAreaInsets();
  
  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diff = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    return diff < 5;
  };
  const [messages, setMessages] = React.useState<any[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide' , () => setIsKeyboardVisible(false));
    
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  React.useEffect(() => {
    fetchMessages();

    // Subscribe to real-time messages for THIS match
    const channel = supabase
      .channel(`match:${match.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `match_id=eq.${match.id}`
      }, payload => {
        // Only add if we don't already have this message (deduplication)
        // This prevents the sender seeing a duplicate from the realtime event
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.new.id);
          if (exists) return prev;
          return [payload.new, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setMessages(data || []);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Optimistic update: add message immediately to UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      match_id: match.id,
      sender_id: user.id,
      text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [optimisticMessage, ...prev]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: match.id, sender_id: user.id, text })
      .select()
      .single();

    if (error) {
      // Rollback on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error(error);
    } else if (data) {
      // Replace temp message with the real one from DB
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={COLORS.primary} size={28} />
          </TouchableOpacity>
          <Image source={{ uri: otherUser.avatar_url || 'https://i.pravatar.cc/150?img=3' }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{otherUser.name || ''}</Text>
            <Text style={[styles.status, !isOnline(otherUser.last_seen) && { color: COLORS.secondary }]}>
              {isOnline(otherUser.last_seen) ? 'Active now' : 'Offline'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
        />

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
            <Send color={COLORS.white} size={20} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  status: {
    fontSize: 12,
    color: '#6AB04C',
    fontWeight: '500',
  },
  messageList: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  theirMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 5,
  },
  theirBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.white,
  },
  theirMessageText: {
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: COLORS.white,
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
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});
