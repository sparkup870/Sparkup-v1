import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, profile, fetchProfile } = useAuthStore();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diff = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    return diff < 5;
  };

  // Re-fetch profile whenever this screen comes into focus
  // so changes from ProfileScreen appear immediately
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user])
  );

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async (reviewMode = isReviewMode) => {
    if (!user) return;
    setLoading(true);

    if (reviewMode) {
      // Get profiles that I rejected
      const { data: rejectedSwipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .eq('action', 'reject');

      const rejectedIds = (rejectedSwipes || []).map(s => s.swiped_id);

      if (rejectedIds.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', rejectedIds)
        .limit(10);

      if (error) console.error(error);
      else setProfiles(data || []);
    } else {
      // Get profiles that I haven't swiped on yet
      const { data: swipedIds } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id);

      const excludedIds = (swipedIds || []).map(s => s.swiped_id);
      excludedIds.push(user.id);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(10);

      if (error) console.error(error);
      else setProfiles(data || []);
    }
    setCurrentIdx(0);
    setLoading(false);
  };

  const handleSwipe = async (action: 'reject' | 'right' | 'super') => {
    if (!user || profiles.length === 0) return;

    const swipedUser = profiles[currentIdx];

    const { error } = await supabase
      .from('swipes')
      .upsert({
        swiper_id: user.id,
        swiped_id: swipedUser.id,
        action: action
      }, { onConflict: 'swiper_id,swiped_id' });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Check if a match was created by our DB trigger
    if (action !== 'reject') {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${swipedUser.id}),and(user1_id.eq.${swipedUser.id},user2_id.eq.${user.id})`)
        .single();

      if (matchData) {
        navigation.navigate('MatchModal', { match: matchData, otherUser: swipedUser });
      }
    }

    if (currentIdx < profiles.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // No more profiles in current batch
      setProfiles([]);
      fetchProfiles();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentProfile = profiles[currentIdx];

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>SparkUp</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.profileCircle} onPress={() => navigation.navigate('Profile')}>
              <Image
                source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/100?img=1' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.cardContainer}>
          {currentProfile ? (
            <View style={styles.card}>
              <Image
                source={{ uri: currentProfile.avatar_url || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80' }}
                style={styles.cardImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.cardOverlay}
              >
                <View style={styles.cardContent}>
                  <View style={styles.locationBadge}>
                    <MapPin color={COLORS.white} size={14} />
                    <Text style={styles.locationText}>{currentProfile.university_domain || 'Campus'}</Text>
                  </View>

                  <View style={styles.nameRow}>
                    <Text style={styles.nameText}>{currentProfile.name || ''}</Text>
                    {isOnline(currentProfile.last_seen) && (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeText}>Active now</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.bioText} numberOfLines={2}>
                    {currentProfile.bio || ''}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No more profiles left!</Text>
              <Text style={styles.emptySubtitle}>You've seen everyone in your area for now.</Text>
              
              {!isReviewMode ? (
                <TouchableOpacity 
                  style={styles.reviewButton} 
                  onPress={() => {
                    setIsReviewMode(true);
                    fetchProfiles(true);
                  }}
                >
                  <Text style={styles.reviewButtonText}>Review Rejected Profiles</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.reviewButton} 
                  onPress={() => {
                    setIsReviewMode(false);
                    fetchProfiles(false);
                  }}
                >
                  <Text style={styles.reviewButtonText}>Back to New Profiles</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        {currentProfile && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]} onPress={() => handleSwipe('reject')}>
              <Text style={styles.actionBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4834DF' }]} onPress={() => handleSwipe('super')}>
              <Text style={styles.actionBtnText}>✨</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6AB04C' }]} onPress={() => handleSwipe('right')}>
              <Text style={styles.actionBtnText}>💖</Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardContent: {
    justifyContent: 'flex-end',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  locationText: {
    color: COLORS.white,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  nameText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 10,
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 176, 76, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6AB04C',
    marginRight: 6,
  },
  activeText: {
    color: '#6AB04C',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  reviewButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  reviewButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 110, // Space for tabs
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  }
});
