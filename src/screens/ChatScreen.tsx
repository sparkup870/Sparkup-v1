import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

const ACTIVE_MATCHES = [
  { id: 1, image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80', online: true },
  { id: 2, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', online: true },
  { id: 3, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', online: false },
  { id: 4, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80', online: false },
];

const CHATS = [
  { id: 1, name: 'Julia', lastMessage: 'You : Hey Julia! How you doin?', time: '09:14 AM', unread: 0, image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80' },
  { id: 2, name: 'Gloria', lastMessage: 'Thanks, I appreciate it. Hey, do you...', time: 'Yesterday', unread: 1, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80' },
  { id: 3, name: 'Jane', lastMessage: 'Same here. I\'ve been working on t...', time: 'Yesterday', unread: 3, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
];

export default function ChatScreen() {
  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
          <TouchableOpacity style={styles.iconCircle}>
            <Search color={COLORS.primary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Active Matches */}
            <Text style={styles.sectionTitle}>Active</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeScroll} contentContainerStyle={{ paddingHorizontal: SIZES.padding }}>
              {ACTIVE_MATCHES.map((match) => (
                <View key={match.id} style={styles.activeAvatarContainer}>
                  <Image source={{ uri: match.image }} style={styles.activeAvatar} />
                  {match.online && <View style={styles.onlineDot} />}
                </View>
              ))}
            </ScrollView>

            {/* Chat List */}
            <View style={styles.chatList}>
              {CHATS.map((chat) => (
                <TouchableOpacity key={chat.id} style={styles.chatItem}>
                  <Image source={{ uri: chat.image }} style={styles.chatAvatar} />
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatName}>{chat.name}</Text>
                      <Text style={styles.chatTime}>{chat.time}</Text>
                    </View>
                    <View style={styles.chatFooter}>
                      <Text style={styles.chatLastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
                      {chat.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{chat.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100, // Tab bar space
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.secondary,
    paddingHorizontal: SIZES.padding,
    marginBottom: 15,
  },
  activeScroll: {
    marginBottom: 25,
  },
  activeAvatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  activeAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.greenDot,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatList: {
    paddingHorizontal: SIZES.padding,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontSize: 14,
    color: COLORS.secondary,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: COLORS.notification,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
