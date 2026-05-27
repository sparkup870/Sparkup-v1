import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Award } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, profile, fetchProfile } = useAuthStore();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // ── Pure RN Animated – no Reanimated, no native module issues ──
  const position = useRef(new Animated.ValueXY()).current;

  const currentProfile =
    profiles.length > 0 && currentIdx < profiles.length
      ? profiles[currentIdx]
      : null;

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60;
    return diff < 5;
  };

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
      const { data: rejectedSwipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)
        .eq('action', 'reject');

      const rejectedIds = (rejectedSwipes || []).map((s) => s.swiped_id);

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
      const { data: swipedRows } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id);

      const excludedIds = (swipedRows || []).map((s) => s.swiped_id);
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
    position.setValue({ x: 0, y: 0 });
    setLoading(false);
  };

  const handleSwipeComplete = async (action: 'reject' | 'right' | 'super') => {
    if (!user || profiles.length === 0 || currentIdx >= profiles.length) return;

    const swipedUser = profiles[currentIdx];

    const { error } = await supabase
      .from('swipes')
      .upsert(
        { swiper_id: user.id, swiped_id: swipedUser.id, action },
        { onConflict: 'swiper_id,swiped_id' }
      );

    if (error) {
      Alert.alert('Error', error.message);
    } else if (action !== 'reject') {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${swipedUser.id}),` +
          `and(user1_id.eq.${swipedUser.id},user2_id.eq.${user.id})`
        )
        .single();

      if (matchData) {
        navigation.navigate('MatchModal', { match: matchData, otherUser: swipedUser });
      }
    }

    if (currentIdx < profiles.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    } else {
      setProfiles([]);
      fetchProfiles();
    }
  };

  /** Animate card off screen left or right, then record the swipe */
  const swipeCard = (direction: 'left' | 'right' | 'up') => {
    const destX =
      direction === 'left' ? -SCREEN_WIDTH * 1.5 :
      direction === 'right' ? SCREEN_WIDTH * 1.5 : 0;

    Animated.timing(position, {
      toValue: { x: destX, y: 0 },   // Y stays 0 — no vertical fly-off
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      const action =
        direction === 'left' ? 'reject' :
        direction === 'right' ? 'right' : 'super';
      handleSwipeComplete(action);
    });
  };

  const resetCard = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  /** Button-triggered swipes */
  const handleSwipe = (action: 'reject' | 'super' | 'right') => {
    if (action === 'reject') swipeCard('left');
    else if (action === 'super') swipeCard('up');
    else swipeCard('right');
  };

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture when horizontal movement clearly dominates
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        // Only move the card left/right — ignore vertical drag entirely
        position.setValue({ x: gs.dx, y: 0 });
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) swipeCard('right');
        else if (gs.dx < -SWIPE_THRESHOLD) swipeCard('left');
        else resetCard();
      },
    })
  ).current;

  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const cardAnimatedStyle = {
    transform: [
      { translateX: position.x },
      // No translateY — card never moves vertically
      { rotate: rotation },
    ],
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>SparkUp</Text>
            <TouchableOpacity
              style={styles.profileCircle}
              onPress={() => navigation.navigate('Profile')}
            >
              <Image
                source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/100?img=1' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>

          {/* Card area */}
          <View style={styles.cardContainer}>
            {currentProfile ? (
              <Animated.View
                style={[styles.card, cardAnimatedStyle]}
                {...panResponder.panHandlers}
              >
                <Image
                  source={{
                    uri:
                      currentProfile.avatar_url ||
                      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
                  }}
                  style={styles.cardImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.cardOverlay}
                >
                  <View style={styles.cardContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.locationBadge}>
                        <MapPin color={COLORS.white} size={14} />
                        <Text style={styles.locationText}>
                          {currentProfile.university_domain || 'Campus'}
                        </Text>
                      </View>
                      {currentProfile.personality_type && (
                        <View
                          style={[
                            styles.locationBadge,
                            { marginLeft: 10, backgroundColor: 'rgba(72,52,223,0.4)' },
                          ]}
                        >
                          <Award color={COLORS.white} size={14} />
                          <Text style={styles.locationText}>
                            {currentProfile.personality_type}
                          </Text>
                        </View>
                      )}
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
              </Animated.View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No more profiles!</Text>
                <Text style={styles.emptySubtitle}>
                  You've seen everyone in your area for now.
                </Text>
                {!isReviewMode ? (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => { setIsReviewMode(true); fetchProfiles(true); }}
                  >
                    <Text style={styles.reviewButtonText}>Review Rejected Profiles</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => { setIsReviewMode(false); fetchProfiles(false); }}
                  >
                    <Text style={styles.reviewButtonText}>Back to New Profiles</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Action buttons — in normal flow, always visible below the card */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]}
              onPress={() => handleSwipe('reject')}
            >
              <Text style={styles.actionBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4834DF' }]}
              onPress={() => handleSwipe('super')}
            >
              <Text style={styles.actionBtnText}>✨</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6AB04C' }]}
              onPress={() => handleSwipe('right')}
            >
              <Text style={styles.actionBtnText}>💖</Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImage: { width: '100%', height: '100%' },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: { width: '100%', height: '100%', position: 'absolute' },
  cardOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  cardContent: { justifyContent: 'flex-end' },
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
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginRight: 10,
  },
  bioText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106,176,76,0.25)',
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
    paddingVertical: 14,
    paddingHorizontal: 20,
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
  },
});
