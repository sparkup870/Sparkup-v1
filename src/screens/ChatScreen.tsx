import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [user])
  );

  useEffect(() => {
    // Subscribe to new matches in real-time
    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, payload => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        user1:user1_id ( id, name, avatar_url, anonymous_id ),
        user2:user2_id ( id, name, avatar_url, anonymous_id )
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      const processedMatches = (data || []).map(m => {
        const otherUser = m.user1_id === user.id ? m.user2 : m.user1;
        return {
          ...m,
          otherUser
        };
      });
      setMatches(processedMatches);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const renderActiveMatch = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.activeAvatarContainer}
      onPress={() => navigation.navigate('ChatDetail', { match: item, otherUser: item.otherUser })}
    >
      <Image 
        source={{ uri: item.otherUser.avatar_url || 'https://i.pravatar.cc/150?img=3' }} 
        style={styles.activeAvatar} 
      />
      <View style={styles.onlineDot}>
        <Text style={{ color: COLORS.white, fontSize: 8, fontWeight: 'bold' }}>{item.compatibility_score}%</Text>
      </View>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatDetail', { match: item, otherUser: item.otherUser })}
    >
      <Image 
        source={{ uri: item.otherUser.avatar_url || 'https://i.pravatar.cc/150?img=12' }} 
        style={styles.chatAvatar} 
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.otherUser.name}</Text>
          <Text style={styles.chatTime}>Just now</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.chatLastMessage} numberOfLines={1}>
            You sparked a connection!
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
          {matches.length > 0 ? (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchMatches();
                  }}
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
                    keyExtractor={(item) => item.id.toString()}
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
              <Text style={{ textAlign: 'center', color: COLORS.secondary }}>No matches yet. Start swiping to spark a connection!</Text>
            </View>
          )}
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.notification,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: SIZES.padding,
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
});
