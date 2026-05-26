import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Award } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

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

  const handleSwipeComplete = async (action: 'reject' | 'right' | 'super') => {
    if (!user || profiles.length === 0 || currentIdx >= profiles.length) return;

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
    } else if (action !== 'reject') {
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
      translateX.value = 0;
      translateY.value = 0;
    } else {
      setProfiles([]);
      fetchProfiles();
    }
  };

  const triggerSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    'worklet';
    let destX = 0;
    let destY = 0;

    if (direction === 'left') destX = -SCREEN_WIDTH * 1.5;
    if (direction === 'right') destX = SCREEN_WIDTH * 1.5;
    if (direction === 'up') destY = -SCREEN_HEIGHT;

    translateX.value = withTiming(destX, { duration: 300 });
    translateY.value = withTiming(destY, { duration: 300 }, () => {
      if (direction === 'left') runOnJS(handleSwipeComplete)('reject');
      else if (direction === 'right') runOnJS(handleSwipeComplete)('right');
      else if (direction === 'up') runOnJS(handleSwipeComplete)('super');
    });
  }, [translateX, translateY, handleSwipeComplete]);

  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      if (translateX.value > SWIPE_THRESHOLD) {
        // Swipe Right
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(handleSwipeComplete)('right');
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        // Swipe Left
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(handleSwipeComplete)('reject');
      } else if (translateY.value < -SWIPE_THRESHOLD) {
        // Swipe Up (Super Like)
        translateY.value = withSpring(-SCREEN_HEIGHT, { velocity: event.velocityY });
        runOnJS(handleSwipeComplete)('super');
      } else {
        // Reset
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const animatedNextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH / 2],
      [0.9, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const renderCard = (profile: any, index: number) => {
    const isTopCard = index === currentIdx;
    const isNextCard = index === currentIdx + 1;

    if (index < currentIdx || index > currentIdx + 1) return null;

    return (
      <Animated.View
        key={profile.id}
        style={[
          styles.cardWrapper,
          isTopCard ? animatedCardStyle : (isNextCard ? animatedNextCardStyle : {}),
          { zIndex: profiles.length - index }
        ]}
      >
        <View style={styles.card}>
          <Image
            source={{ uri: profile.avatar_url || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80' }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardOverlay}
          >
            <View style={styles.cardContent}>
              <View style={styles.locationBadge}>
                <MapPin color={COLORS.white} size={14} />
                <Text style={styles.locationText}>{profile.university_domain || 'Campus'}</Text>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{profile.name}</Text>
              </View>

              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.locationBadge}>
                      <MapPin color={COLORS.white} size={14} />
                      <Text style={styles.locationText}>{currentProfile.university_domain || 'Campus'}</Text>
                    </View>
                    {currentProfile.personality_type && (
                      <View style={[styles.locationBadge, { marginLeft: 10, backgroundColor: 'rgba(72, 52, 223, 0.4)' }]}>
                        <Award color={COLORS.white} size={14} />
                        <Text style={styles.locationText}>{currentProfile.personality_type}</Text>
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
    </GestureHandlerRootView >
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
    zIndex: 100,
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
  cardWrapper: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    bottom: 100, // Space for tabs and buttons
  },
  card: {
    flex: 1,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
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
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 100,
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
