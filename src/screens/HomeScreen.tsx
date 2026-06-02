import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Award, X, Heart, Star } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// Action button config
const ACTION_BUTTONS = [
  { action: 'reject' as const, icon: X,     bg: '#FF6B6B', size: 56, iconSize: 22, shadow: '#FF6B6B' },
  { action: 'super'  as const, icon: Star,  bg: '#4834DF', size: 64, iconSize: 26, shadow: '#4834DF' },
  { action: 'right'  as const, icon: Heart, bg: '#6AB04C', size: 56, iconSize: 22, shadow: '#6AB04C' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, profile, fetchProfile } = useAuthStore();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);       // only true on very first load
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const isSwiping = useRef(false);                     // guard against double-swipes

  // Card drag animation
  const position = useRef(new Animated.ValueXY()).current;

  // Per-button press scale animations
  const btnScales = useRef(ACTION_BUTTONS.map(() => new Animated.Value(1))).current;

  const currentProfile =
    profiles.length > 0 && currentIdx < profiles.length
      ? profiles[currentIdx]
      : null;

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) / 60000 < 5;
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user])
  );

  useEffect(() => {
    fetchProfiles();
  }, []);

  // ─── Cosine similarity ────────────────────────────────────────────────────
  // Returns 0-100 score. Both vectors must be same length.
  const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length === 0 || b.length !== a.length) return 50; // neutral fallback
    const dot   = a.reduce((s, v, i) => s + v * b[i], 0);
    const normA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    if (normA === 0 || normB === 0) return 50;
    // cosine is -1 to 1 → map to 0-100
    return Math.round(((dot / (normA * normB)) + 1) / 2 * 100);
  };

  // Fetch answer vector for a user: returns array of answer_values sorted by question creation order
  const fetchAnswerVector = async (userId: string): Promise<number[]> => {
    const { data } = await supabase
      .from('user_answers')
      .select('answer_value, questions(created_at)')
      .eq('user_id', userId)
      .order('questions(created_at)', { ascending: true });
    return (data || []).map((r: any) => r.answer_value ?? 0);
  };

  // ─── Data fetching ────────────────────────────────────────────────────────
  // silent=true → no loading spinner (used when refilling mid-session)
  const fetchProfiles = async (reviewMode = isReviewMode, silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);

    // Get current user's answer vector once
    const myVector = await fetchAnswerVector(user.id);

    let candidates: any[] = [];

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
        .limit(20);

      if (error) console.error(error);
      else candidates = data || [];
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
        .limit(40);

      if (error) console.error(error);
      else candidates = data || [];
    }

    // Compute compatibility score for each candidate
    const withScores = await Promise.all(
      candidates.map(async (p) => {
        const theirVector = await fetchAnswerVector(p.id);
        const score = cosineSimilarity(myVector, theirVector);
        return { ...p, compatibility_score: score };
      })
    );

    // Sort by compatibility descending
    withScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    setProfiles(withScores);
    setCurrentIdx(0);
    position.setValue({ x: 0, y: 0 });
    setLoading(false);
  };

  // ─── Swipe logic ──────────────────────────────────────────────────────────
  const handleSwipeComplete = (action: 'reject' | 'right' | 'super') => {
    if (!user || !currentProfile) return;
    if (isSwiping.current) return;
    isSwiping.current = true;

    // Snapshot the profile we acted on BEFORE advancing the index
    const actedProfile = currentProfile;
    const nextIdx = currentIdx + 1;
    const hasMore = nextIdx < profiles.length;

    // ── 1. Advance UI immediately ──────────────────────────────────────────
    if (hasMore) {
      setCurrentIdx(nextIdx);
      position.setValue({ x: 0, y: 0 });
    } else {
      // End of deck — clear immediately, fetch silently in background
      setCurrentIdx(0);
      setProfiles([]);
      fetchProfiles(isReviewMode, /* silent= */ true);
    }

    // ── Unlock immediately so the next swipe gesture is not blocked ────────
    isSwiping.current = false;

    // ── 2. DB write fires in background — does NOT block the next card ─────
    (async () => {
      const { error } = await supabase
        .from('swipes')
        .upsert(
          { swiper_id: user.id, swiped_id: actedProfile.id, action },
          { onConflict: 'swiper_id,swiped_id' }
        );

      if (error) {
        console.warn('Swipe write error:', error.message);
      } else if (action !== 'reject') {
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .or(
            `and(user1_id.eq.${user.id},user2_id.eq.${actedProfile.id}),` +
            `and(user1_id.eq.${actedProfile.id},user2_id.eq.${user.id})`
          )
          .maybeSingle();

        if (matchData) {
          navigation.navigate('MatchModal', { match: matchData, otherUser: actedProfile });
        }
      }
    })();
  };

  const swipeCard = (direction: 'left' | 'right') => {
    const destX = direction === 'left' ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x: destX, y: 0 },
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      handleSwipeComplete(direction === 'left' ? 'reject' : 'right');
    });
  };

  const resetCard = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      tension: 40,
      friction: 6,
    }).start();
  };

  const handleSwipe = (action: 'reject' | 'super' | 'right') => {
    if (!currentProfile) return;
    if (action === 'reject') swipeCard('left');
    else if (action === 'right') swipeCard('right');
    else handleSwipeComplete('super'); // super like — no fly-off animation
  };

  // Button press micro-interaction
  const animateButtonPress = (index: number, action: 'reject' | 'super' | 'right') => {
    Animated.sequence([
      Animated.spring(btnScales[index], {
        toValue: 0.82,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
      Animated.spring(btnScales[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start();
    handleSwipe(action);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        position.setValue({ x: gs.dx, y: 0 });
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) swipeCard('right');
        else if (gs.dx < -SWIPE_THRESHOLD) swipeCard('left');
        else resetCard();
      },
    })
  ).current;

  // Derived animated values
  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardAnimatedStyle = {
    transform: [{ translateX: position.x }, { rotate: rotation }],
  };

  // The action row sits above the tab bar — tab bar is absolute with height 90
  const ACTION_ROW_BOTTOM = tabBarHeight + 8;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding people near you…</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.logoText}>SparkUp</Text>
            <TouchableOpacity
              style={styles.profileCircle}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profile')}
            >
              <Image
                source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/100?img=1' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>

          {/* ── Card area — leaves room for action buttons above tab bar ── */}
          <View style={[styles.cardContainer, { paddingBottom: ACTION_ROW_BOTTOM + 88 }]}>
            {currentProfile ? (
              <View style={styles.cardStack}>
                {/* ── Next card pre-rendered underneath ── */}
                {profiles[currentIdx + 1] && (
                  <View style={[styles.card, styles.cardBehind]} pointerEvents="none">
                    <Image
                      source={{ uri: profiles[currentIdx + 1].avatar_url || 'https://i.pravatar.cc/800' }}
                      style={styles.cardImage}
                    />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={styles.cardOverlay}>
                      <View style={styles.cardContent}>
                        <Text style={styles.nameText} numberOfLines={1}>
                          {profiles[currentIdx + 1].name || ''}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                )}

                {/* ── Current (draggable) card ── */}
                <Animated.View
                  style={[styles.card, styles.cardFront, cardAnimatedStyle]}
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

                  {/* LIKE stamp */}
                  <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
                    <Text style={styles.stampText}>LIKE</Text>
                  </Animated.View>

                  {/* NOPE stamp */}
                  <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
                    <Text style={[styles.stampText, { color: '#FF6B6B' }]}>NOPE</Text>
                  </Animated.View>

                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.88)']}
                    style={styles.cardOverlay}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.badgeRow}>
                        <View style={styles.locationBadge}>
                          <MapPin color={COLORS.white} size={13} />
                          <Text style={styles.locationText}>
                            {currentProfile.university_domain || 'Campus'}
                          </Text>
                        </View>
                        {currentProfile.personality_type && (
                          <View style={[styles.locationBadge, styles.personalityBadge]}>
                            <Award color={COLORS.white} size={13} />
                            <Text style={styles.locationText}>
                              {currentProfile.personality_type}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.nameRow}>
                        <Text style={styles.nameText} numberOfLines={1}>
                          {currentProfile.name || ''}
                        </Text>
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

                      {/* Compatibility score pill */}
                      {currentProfile.compatibility_score !== undefined && (
                        <View style={styles.compatBadge}>
                          <Text style={styles.compatText}>
                            ⚡ {currentProfile.compatibility_score}% match
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </Animated.View>
              </View>
            ) : (
              /* ── Empty state ── */
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🌟</Text>
                <Text style={styles.emptyTitle}>You're all caught up!</Text>
                <Text style={styles.emptySubtitle}>
                  No new profiles right now. Check back soon or revisit people you passed on.
                </Text>
                <TouchableOpacity
                  style={styles.reviewButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    const next = !isReviewMode;
                    setIsReviewMode(next);
                    fetchProfiles(next, false);
                  }}
                >
                  <Text style={styles.reviewButtonText}>
                    {isReviewMode ? 'Back to New Profiles' : 'Review Rejected Profiles'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Action buttons — floats above tab bar ── */}
          {currentProfile && (
            <View style={[styles.actionRow, { bottom: ACTION_ROW_BOTTOM }]}>
              {ACTION_BUTTONS.map(({ action, icon: Icon, bg, size, iconSize, shadow }, i) => (
                <Animated.View
                  key={action}
                  style={{ transform: [{ scale: btnScales[i] }] }}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.actionBtn,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: bg,
                        shadowColor: shadow,
                      },
                    ]}
                    onPress={() => animateButtonPress(i, action)}
                  >
                    <Icon color="#fff" size={iconSize} strokeWidth={2.5} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTop,
    gap: 12,
  },
  loadingText: {
    color: COLORS.secondary,
    fontSize: 14,
  },
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileImage: { width: '100%', height: '100%' },

  // Card container
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  // Stack wrapper — gives absolute children a real bounding box
  cardStack: {
    flex: 1,
  },
  // Swipe card
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  cardBehind: {
    transform: [{ scale: 0.96 }],
    zIndex: 0,
    elevation: 8,
  },
  cardFront: {
    zIndex: 1,
    elevation: 10,
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
  cardContent: { justifyContent: 'flex-end' },

  // Swipe stamps
  stamp: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 10,
  },
  likeStamp: {
    left: 20,
    borderColor: '#6AB04C',
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#FF6B6B',
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#6AB04C',
    letterSpacing: 2,
  },

  // Card info
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  personalityBadge: {
    backgroundColor: 'rgba(72,52,223,0.4)',
  },
  locationText: {
    color: COLORS.white,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 8,
  },
  nameText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  bioText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106,176,76,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6AB04C',
    marginRight: 5,
  },
  activeText: {
    color: '#6AB04C',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  reviewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  reviewButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Action buttons
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },

  // Compatibility badge on card
  compatBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  compatText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
