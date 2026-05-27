import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, RefreshControl,
  Image, ScrollView, Animated, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageSquare, Heart, X, Plus, Trash2, Image as ImageIcon,
  BarChart2, Calendar, Megaphone, Send, ChevronRight,
  MapPin, Clock, Users, Check, CheckSquare, Square,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type PostType = 'text' | 'poll' | 'event' | 'announcement';

interface PollOption { id: string; text: string; votes: number; voters: string[]; }
interface Post {
  id: string; user_id: string; author_name: string; author_avatar?: string;
  content: string; post_type: PostType; likes_count: number; created_at: string;
  images?: string[]; tags?: string[];
  poll_options?: PollOption[]; poll_anonymous?: boolean; poll_multi?: boolean; poll_expires_at?: string;
  event_title?: string; event_date?: string; event_time?: string;
  event_location?: string; event_cover?: string; event_rsvp_count?: number;
  post_comments?: { id: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (ts: string) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const POST_TYPES: { type: PostType; label: string; icon: any; color: string; bg: string }[] = [
  { type: 'text',         label: 'Post',         icon: MessageSquare, color: '#4834DF', bg: '#EEF0FF' },
  { type: 'poll',         label: 'Poll',         icon: BarChart2,     color: '#F59E0B', bg: '#FEF3C7' },
  { type: 'event',        label: 'Event',        icon: Calendar,      color: '#10B981', bg: '#D1FAE5' },
  { type: 'announcement', label: 'Announce',     icon: Megaphone,     color: '#EF4444', bg: '#FEE2E2' },
];

const TYPE_COLORS: Record<PostType, { accent: string; bg: string; label: string }> = {
  text:         { accent: '#4834DF', bg: '#EEF0FF',  label: 'Post'         },
  poll:         { accent: '#F59E0B', bg: '#FEF3C7',  label: 'Poll'         },
  event:        { accent: '#10B981', bg: '#D1FAE5',  label: 'Event'        },
  announcement: { accent: '#EF4444', bg: '#FEE2E2',  label: 'Announcement' },
};

const uid = () => Math.random().toString(36).slice(2);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge for post type */
const TypeBadge = ({ type }: { type: PostType }) => {
  const cfg = TYPE_COLORS[type];
  const Icon = POST_TYPES.find(p => p.type === type)?.icon;
  return (
    <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
      {Icon && <Icon color={cfg.accent} size={11} strokeWidth={2.5} />}
      <Text style={[badgeStyles.label, { color: cfg.accent }]}>{cfg.label}</Text>
    </View>
  );
};
const badgeStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4, alignSelf: 'flex-start' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

/** Avatar circle */
const Avatar = ({ name, uri, size = 40 }: { name: string; uri?: string; size?: number }) => (
  uri
    ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EEF0FF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#4834DF', fontWeight: '800', fontSize: size * 0.38 }}>{(name || 'A')[0].toUpperCase()}</Text>
      </View>
);

/** Image grid — 1, 2, or 3+ images */
const ImageGrid = ({ images, onPress }: { images: string[]; onPress: (i: number) => void }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  if (count === 1) return (
    <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.9} style={imgStyles.single}>
      <Image source={{ uri: images[0] }} style={imgStyles.singleImg} resizeMode="cover" />
    </TouchableOpacity>
  );
  if (count === 2) return (
    <View style={imgStyles.row}>
      {images.map((uri, i) => (
        <TouchableOpacity key={i} onPress={() => onPress(i)} activeOpacity={0.9} style={imgStyles.half}>
          <Image source={{ uri }} style={imgStyles.halfImg} resizeMode="cover" />
        </TouchableOpacity>
      ))}
    </View>
  );
  return (
    <View style={imgStyles.row}>
      <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.9} style={imgStyles.twoThird}>
        <Image source={{ uri: images[0] }} style={imgStyles.fullHeight} resizeMode="cover" />
      </TouchableOpacity>
      <View style={imgStyles.oneThirdCol}>
        {images.slice(1, 3).map((uri, i) => (
          <TouchableOpacity key={i} onPress={() => onPress(i + 1)} activeOpacity={0.9} style={imgStyles.oneThird}>
            <Image source={{ uri }} style={imgStyles.fullHeight} resizeMode="cover" />
            {i === 1 && count > 3 && (
              <View style={imgStyles.moreOverlay}>
                <Text style={imgStyles.moreText}>+{count - 3}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
const imgStyles = StyleSheet.create({
  single: { borderRadius: 14, overflow: 'hidden', marginTop: 12 },
  singleImg: { width: '100%', height: 220 },
  row: { flexDirection: 'row', gap: 4, marginTop: 12, height: 200, borderRadius: 14, overflow: 'hidden' },
  half: { flex: 1 },
  halfImg: { width: '100%', height: '100%' },
  twoThird: { flex: 2 },
  oneThirdCol: { flex: 1, gap: 4 },
  oneThird: { flex: 1, overflow: 'hidden' },
  fullHeight: { width: '100%', height: '100%' },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  moreText: { color: '#fff', fontSize: 22, fontWeight: '800' },
});

/** Poll card body */
const PollBody = ({ post, userId, onVote }: { post: Post; userId?: string; onVote: (postId: string, optionId: string) => void }) => {
  const options = post.poll_options || [];
  const totalVotes = options.reduce((s, o) => s + o.votes, 0);
  const userVoted = options.some(o => o.voters?.includes(userId || ''));
  const isExpired = post.poll_expires_at ? new Date(post.poll_expires_at) < new Date() : false;

  return (
    <View style={pollStyles.container}>
      {options.map(opt => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        const voted = opt.voters?.includes(userId || '');
        const showBar = userVoted || isExpired;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[pollStyles.option, voted && pollStyles.optionVoted]}
            onPress={() => !userVoted && !isExpired && onVote(post.id, opt.id)}
            activeOpacity={userVoted || isExpired ? 1 : 0.75}
          >
            {showBar && <View style={[pollStyles.bar, { width: `${pct}%` as any, backgroundColor: voted ? '#4834DF22' : '#F3F4F6' }]} />}
            <View style={pollStyles.optionRow}>
              <View style={[pollStyles.radio, voted && pollStyles.radioFilled]}>
                {voted && <View style={pollStyles.radioDot} />}
              </View>
              <Text style={[pollStyles.optionText, voted && { fontWeight: '700', color: '#4834DF' }]}>{opt.text}</Text>
              {showBar && <Text style={pollStyles.pct}>{pct}%</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={pollStyles.meta}>
        <Text style={pollStyles.metaText}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
        {post.poll_anonymous && <Text style={pollStyles.metaText}> · Anonymous</Text>}
        {isExpired ? <Text style={[pollStyles.metaText, { color: '#EF4444' }]}> · Ended</Text>
          : post.poll_expires_at && <Text style={pollStyles.metaText}> · Ends {formatTime(post.poll_expires_at)}</Text>}
      </View>
    </View>
  );
};
const pollStyles = StyleSheet.create({
  container: { marginTop: 12, gap: 8 },
  option: { borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#FAFAFA' },
  optionVoted: { borderColor: '#4834DF' },
  bar: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioFilled: { borderColor: '#4834DF' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4834DF' },
  optionText: { flex: 1, fontSize: 14, color: COLORS.primary },
  pct: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  meta: { flexDirection: 'row', marginTop: 4 },
  metaText: { fontSize: 12, color: COLORS.secondary },
});

/** Event card body */
const EventBody = ({ post, userId, onRsvp }: { post: Post; userId?: string; onRsvp: (postId: string) => void }) => (
  <View style={eventStyles.container}>
    {post.event_cover && (
      <Image source={{ uri: post.event_cover }} style={eventStyles.cover} resizeMode="cover" />
    )}
    <View style={eventStyles.info}>
      {post.event_title && <Text style={eventStyles.title}>{post.event_title}</Text>}
      <View style={eventStyles.row}>
        <Calendar color="#10B981" size={14} strokeWidth={2} />
        <Text style={eventStyles.detail}>{post.event_date || 'TBD'}</Text>
        {post.event_time && <><Clock color="#10B981" size={14} strokeWidth={2} /><Text style={eventStyles.detail}>{post.event_time}</Text></>}
      </View>
      {post.event_location && (
        <View style={eventStyles.row}>
          <MapPin color="#10B981" size={14} strokeWidth={2} />
          <Text style={eventStyles.detail}>{post.event_location}</Text>
        </View>
      )}
      <View style={eventStyles.rsvpRow}>
        <TouchableOpacity style={eventStyles.rsvpBtn} onPress={() => onRsvp(post.id)} activeOpacity={0.85}>
          <Check color="#fff" size={14} strokeWidth={3} />
          <Text style={eventStyles.rsvpText}>I'm Going</Text>
        </TouchableOpacity>
        <View style={eventStyles.attendees}>
          <Users color={COLORS.secondary} size={14} />
          <Text style={eventStyles.attendeesText}>{post.event_rsvp_count || 0} going</Text>
        </View>
      </View>
    </View>
  </View>
);
const eventStyles = StyleSheet.create({
  container: { marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#D1FAE5', backgroundColor: '#F0FDF4' },
  cover: { width: '100%', height: 160 },
  info: { padding: 14, gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#065F46' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detail: { fontSize: 13, color: '#047857', fontWeight: '500' },
  rsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  rsvpBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  rsvpText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  attendees: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attendeesText: { fontSize: 13, color: COLORS.secondary, fontWeight: '500' },
});

/** Announcement banner */
const AnnouncementBanner = ({ content }: { content: string }) => (
  <View style={annStyles.banner}>
    <Megaphone color="#EF4444" size={18} strokeWidth={2} />
    <Text style={annStyles.text}>{content}</Text>
  </View>
);
const annStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', borderRadius: 10, padding: 12, marginTop: 8 },
  text: { flex: 1, fontSize: 14, color: '#991B1B', lineHeight: 20, fontWeight: '500' },
});

/** Like button with bounce animation */
const LikeButton = ({ liked, count, onPress }: { liked: boolean; count: number; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const tap = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, tension: 300, friction: 5 }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity style={likeStyles.btn} onPress={tap} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart color={liked ? '#FF4757' : COLORS.secondary} fill={liked ? '#FF4757' : 'transparent'} size={18} />
      </Animated.View>
      <Text style={[likeStyles.count, liked && { color: '#FF4757' }]}>{count}</Text>
    </TouchableOpacity>
  );
};
const likeStyles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PostsScreen() {
  const { user, profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userRsvps, setUserRsvps] = useState<Set<string>>(new Set());

  // Composer state
  const [composerVisible, setComposerVisible] = useState(false);
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Poll state
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollMulti, setPollMulti] = useState(false);
  const [pollExpiry, setPollExpiry] = useState('');

  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCover, setEventCover] = useState('');

  // Comments
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  useEffect(() => { fetchPosts(); if (user) { fetchUserLikes(); fetchUserRsvps(); } }, [user]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts').select('*, post_comments(id)').order('created_at', { ascending: false });
      if (error) throw error;
      setPosts((data || []) as Post[]);
    } catch (e: any) { console.error(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id);
    if (data) setUserLikes(new Set(data.map((l: any) => l.post_id)));
  };

  const fetchUserRsvps = async () => {
    if (!user) return;
    const { data } = await supabase.from('event_rsvps').select('post_id').eq('user_id', user.id);
    if (data) setUserRsvps(new Set(data.map((r: any) => r.post_id)));
  };

  const fetchComments = async (postId: string) => {
    setCommentLoading(true);
    const { data } = await supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    setComments(data || []);
    setCommentLoading(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLike = async (postId: string, currentCount: number) => {
    if (!user) return;
    const liked = userLikes.has(postId);
    const next = liked ? currentCount - 1 : currentCount + 1;
    setPosts(p => p.map(x => x.id === postId ? { ...x, likes_count: next } : x));
    const nl = new Set(userLikes); liked ? nl.delete(postId) : nl.add(postId); setUserLikes(nl);
    if (liked) { await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id); }
    else { await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id }); }
    await supabase.from('posts').update({ likes_count: next }).eq('id', postId);
  };

  const handleVote = async (postId: string, optionId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post?.poll_options) return;
    const updated = post.poll_options.map(o =>
      o.id === optionId ? { ...o, votes: o.votes + 1, voters: [...(o.voters || []), user.id] } : o
    );
    setPosts(p => p.map(x => x.id === postId ? { ...x, poll_options: updated } : x));
    await supabase.from('posts').update({ poll_options: updated }).eq('id', postId);
  };

  const handleRsvp = async (postId: string) => {
    if (!user) return;
    if (userRsvps.has(postId)) return;
    const nr = new Set(userRsvps); nr.add(postId); setUserRsvps(nr);
    setPosts(p => p.map(x => x.id === postId ? { ...x, event_rsvp_count: (x.event_rsvp_count || 0) + 1 } : x));
    await supabase.from('event_rsvps').insert({ post_id: postId, user_id: user.id });
    await supabase.rpc('increment_rsvp', { post_id: postId });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !commentPost) return;
    await supabase.from('post_comments').insert({
      post_id: commentPost.id, user_id: user.id,
      author_name: profile?.name || 'Anonymous', content: newComment.trim(),
    });
    setNewComment('');
    fetchComments(commentPost.id);
    fetchPosts();
  };

  const handleDeleteComment = (id: string) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('post_comments').delete().eq('id', id);
        if (commentPost) fetchComments(commentPost.id);
        fetchPosts();
      }},
    ]);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.7, selectionLimit: 4,
    });
    if (!result.canceled) setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 4));
  };

  const pickEventCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setEventCover(result.assets[0].uri);
  };

  const resetComposer = () => {
    setContent(''); setImages([]); setTags(''); setPostType('text');
    setPollOptions(['', '']); setPollAnonymous(false); setPollMulti(false); setPollExpiry('');
    setEventTitle(''); setEventDate(''); setEventTime(''); setEventLocation(''); setEventCover('');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (postType === 'text' && !content.trim()) return;
    if (postType === 'announcement' && !content.trim()) return;
    if (postType === 'poll' && pollOptions.filter(o => o.trim()).length < 2) {
      Alert.alert('Poll needs at least 2 options'); return;
    }
    if (postType === 'event' && !eventTitle.trim()) {
      Alert.alert('Event needs a title'); return;
    }
    setSubmitting(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload: any = {
        user_id: user.id, author_name: profile?.name || 'Anonymous',
        author_avatar: profile?.avatar_url || null,
        content: content.trim(), post_type: postType,
        likes_count: 0, tags: tagList.length ? tagList : null,
        images: images.length ? images : null,
      };
      if (postType === 'poll') {
        payload.poll_options = pollOptions.filter(o => o.trim()).map(o => ({ id: uid(), text: o.trim(), votes: 0, voters: [] }));
        payload.poll_anonymous = pollAnonymous;
        payload.poll_multi = pollMulti;
        payload.poll_expires_at = pollExpiry || null;
      }
      if (postType === 'event') {
        payload.event_title = eventTitle.trim();
        payload.event_date = eventDate.trim() || null;
        payload.event_time = eventTime.trim() || null;
        payload.event_location = eventLocation.trim() || null;
        payload.event_cover = eventCover || null;
        payload.event_rsvp_count = 0;
      }
      const { error } = await supabase.from('posts').insert(payload);
      if (error) throw error;
      resetComposer(); setComposerVisible(false); fetchPosts();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  // ── Post card renderer ────────────────────────────────────────────────────
  const renderPost = useCallback(({ item }: { item: Post }) => {
    const liked = userLikes.has(item.id);
    const commentCount = item.post_comments?.length || 0;
    return (
      <View style={cardStyles.card}>
        {/* Header */}
        <View style={cardStyles.header}>
          <Avatar name={item.author_name} uri={item.author_avatar} />
          <View style={cardStyles.headerText}>
            <Text style={cardStyles.author}>{item.author_name}</Text>
            <Text style={cardStyles.time}>{formatTime(item.created_at)}</Text>
          </View>
          <TypeBadge type={item.post_type} />
        </View>

        {/* Content */}
        {item.post_type === 'announcement'
          ? <AnnouncementBanner content={item.content} />
          : item.content ? <Text style={cardStyles.content}>{item.content}</Text> : null
        }

        {/* Type-specific bodies */}
        {item.post_type === 'poll' && <PollBody post={item} userId={user?.id} onVote={handleVote} />}
        {item.post_type === 'event' && <EventBody post={item} userId={user?.id} onRsvp={handleRsvp} />}

        {/* Images */}
        {item.images && item.images.length > 0 && item.post_type !== 'event' && (
          <ImageGrid images={item.images} onPress={i => { setLightboxImages(item.images!); setLightboxIndex(i); setLightboxVisible(true); }} />
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={cardStyles.tagRow}>
            {item.tags.map(t => <View key={t} style={cardStyles.tag}><Text style={cardStyles.tagText}>#{t}</Text></View>)}
          </View>
        )}

        {/* Footer */}
        <View style={cardStyles.footer}>
          <LikeButton liked={liked} count={item.likes_count || 0} onPress={() => handleLike(item.id, item.likes_count)} />
          <TouchableOpacity style={cardStyles.footerBtn} onPress={() => { setCommentPost(item); setComments([]); fetchComments(item.id); }}>
            <MessageSquare color={COLORS.secondary} size={18} />
            <Text style={cardStyles.footerBtnText}>{commentCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [userLikes, posts]);

  // ── Composer sections ─────────────────────────────────────────────────────
  const renderPollComposer = () => (
    <View style={composerStyles.section}>
      <Text style={composerStyles.sectionLabel}>Poll Options</Text>
      {pollOptions.map((opt, i) => (
        <View key={i} style={composerStyles.pollRow}>
          <TextInput
            style={composerStyles.pollInput}
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChangeText={v => { const n = [...pollOptions]; n[i] = v; setPollOptions(n); }}
          />
          {pollOptions.length > 2 && (
            <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
              <X color="#EF4444" size={18} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {pollOptions.length < 6 && (
        <TouchableOpacity style={composerStyles.addOption} onPress={() => setPollOptions([...pollOptions, ''])}>
          <Plus color="#4834DF" size={16} /><Text style={composerStyles.addOptionText}>Add option</Text>
        </TouchableOpacity>
      )}
      <View style={composerStyles.toggleRow}>
        <TouchableOpacity style={composerStyles.toggle} onPress={() => setPollAnonymous(!pollAnonymous)}>
          {pollAnonymous ? <CheckSquare color="#4834DF" size={18} /> : <Square color={COLORS.secondary} size={18} />}
          <Text style={composerStyles.toggleText}>Anonymous voting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={composerStyles.toggle} onPress={() => setPollMulti(!pollMulti)}>
          {pollMulti ? <CheckSquare color="#4834DF" size={18} /> : <Square color={COLORS.secondary} size={18} />}
          <Text style={composerStyles.toggleText}>Multi-select</Text>
        </TouchableOpacity>
      </View>
      <TextInput style={composerStyles.input} placeholder="Expiry (e.g. 2025-12-31T23:59)" value={pollExpiry} onChangeText={setPollExpiry} />
    </View>
  );

  const renderEventComposer = () => (
    <View style={composerStyles.section}>
      <Text style={composerStyles.sectionLabel}>Event Details</Text>
      <TextInput style={composerStyles.input} placeholder="Event title *" value={eventTitle} onChangeText={setEventTitle} />
      <View style={composerStyles.row}>
        <TextInput style={[composerStyles.input, { flex: 1 }]} placeholder="Date (e.g. Dec 25)" value={eventDate} onChangeText={setEventDate} />
        <TextInput style={[composerStyles.input, { flex: 1 }]} placeholder="Time (e.g. 6:00 PM)" value={eventTime} onChangeText={setEventTime} />
      </View>
      <TextInput style={composerStyles.input} placeholder="Location" value={eventLocation} onChangeText={setEventLocation} />
      <TouchableOpacity style={composerStyles.coverPicker} onPress={pickEventCover} activeOpacity={0.8}>
        {eventCover
          ? <Image source={{ uri: eventCover }} style={composerStyles.coverPreview} resizeMode="cover" />
          : <><ImageIcon color="#10B981" size={20} /><Text style={composerStyles.coverText}>Add cover image</Text></>
        }
      </TouchableOpacity>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={screenStyles.header}>
          <Text style={screenStyles.title}>Campus Feed</Text>
          <TouchableOpacity style={screenStyles.newBtn} onPress={() => setComposerVisible(true)} activeOpacity={0.85}>
            <Plus color="#fff" size={18} strokeWidth={3} />
            <Text style={screenStyles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id}
            renderItem={renderPost}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 20, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={screenStyles.empty}>
                <Text style={screenStyles.emptyEmoji}>📢</Text>
                <Text style={screenStyles.emptyTitle}>Nothing here yet</Text>
                <Text style={screenStyles.emptySubtitle}>Be the first to post something on campus!</Text>
              </View>
            }
          />
        )}

        {/* ── Composer Modal ── */}
        <Modal visible={composerVisible} animationType="slide" transparent onRequestClose={() => setComposerVisible(false)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={modalStyles.overlay}>
              <View style={modalStyles.sheet}>
                {/* Modal header */}
                <View style={modalStyles.handle} />
                <View style={modalStyles.header}>
                  <TouchableOpacity onPress={() => { setComposerVisible(false); resetComposer(); }}>
                    <X color={COLORS.primary} size={22} />
                  </TouchableOpacity>
                  <Text style={modalStyles.title}>Create Post</Text>
                  <TouchableOpacity
                    style={[modalStyles.postBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit} disabled={submitting}
                  >
                    {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modalStyles.postBtnText}>Post</Text>}
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Type selector */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={composerStyles.typeRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                    {POST_TYPES.map(pt => {
                      const Icon = pt.icon;
                      const active = postType === pt.type;
                      return (
                        <TouchableOpacity key={pt.type} style={[composerStyles.typeChip, active && { backgroundColor: pt.color }]} onPress={() => setPostType(pt.type)} activeOpacity={0.8}>
                          <Icon color={active ? '#fff' : pt.color} size={15} strokeWidth={2.5} />
                          <Text style={[composerStyles.typeChipText, active && { color: '#fff' }]}>{pt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={{ paddingHorizontal: 16 }}>
                    {/* Author row */}
                    <View style={composerStyles.authorRow}>
                      <Avatar name={profile?.name || 'Me'} uri={profile?.avatar_url} size={38} />
                      <Text style={composerStyles.authorName}>{profile?.name || 'You'}</Text>
                    </View>

                    {/* Main text */}
                    <TextInput
                      style={composerStyles.mainInput}
                      placeholder={
                        postType === 'poll' ? "Ask your campus a question…" :
                        postType === 'event' ? "Describe the event…" :
                        postType === 'announcement' ? "Write your announcement…" :
                        "What's happening on campus?"
                      }
                      multiline autoFocus value={content} onChangeText={setContent} maxLength={500}
                    />
                    <Text style={composerStyles.charCount}>{content.length}/500</Text>

                    {/* Type-specific fields */}
                    {postType === 'poll' && renderPollComposer()}
                    {postType === 'event' && renderEventComposer()}

                    {/* Image picker (not for event — has its own cover) */}
                    {postType !== 'event' && (
                      <View style={composerStyles.section}>
                        <TouchableOpacity style={composerStyles.imgPickerBtn} onPress={pickImages} activeOpacity={0.8}>
                          <ImageIcon color="#4834DF" size={18} />
                          <Text style={composerStyles.imgPickerText}>Add images ({images.length}/4)</Text>
                        </TouchableOpacity>
                        {images.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                            {images.map((uri, i) => (
                              <View key={i} style={composerStyles.thumbWrap}>
                                <Image source={{ uri }} style={composerStyles.thumb} />
                                <TouchableOpacity style={composerStyles.thumbRemove} onPress={() => setImages(images.filter((_, j) => j !== i))}>
                                  <X color="#fff" size={12} strokeWidth={3} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    {/* Tags */}
                    <TextInput style={composerStyles.input} placeholder="Tags (comma separated, e.g. fest, sports)" value={tags} onChangeText={setTags} />
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Comments Modal ── */}
        <Modal visible={!!commentPost} animationType="slide" transparent onRequestClose={() => setCommentPost(null)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={modalStyles.overlay}>
              <View style={[modalStyles.sheet, { height: '90%' }]}>
                <View style={modalStyles.handle} />
                <View style={modalStyles.header}>
                  <TouchableOpacity onPress={() => setCommentPost(null)}><X color={COLORS.primary} size={22} /></TouchableOpacity>
                  <Text style={modalStyles.title}>Discussion</Text>
                  <View style={{ width: 22 }} />
                </View>
                {commentPost && (
                  <View style={commentStyles.postSummary}>
                    <Text style={commentStyles.summaryAuthor}>{commentPost.author_name}</Text>
                    <Text style={commentStyles.summaryContent} numberOfLines={2}>{commentPost.content}</Text>
                  </View>
                )}
                {commentLoading
                  ? <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
                  : <FlatList
                      data={comments}
                      keyExtractor={c => c.id}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                      renderItem={({ item }) => (
                        <View style={commentStyles.item}>
                          <Avatar name={item.author_name} size={32} />
                          <View style={commentStyles.bubble}>
                            <View style={commentStyles.bubbleHeader}>
                              <Text style={commentStyles.bubbleAuthor}>{item.author_name}</Text>
                              <Text style={commentStyles.bubbleTime}>{formatTime(item.created_at)}</Text>
                              {user?.id === item.user_id && (
                                <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                                  <Trash2 color="#EF4444" size={14} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <Text style={commentStyles.bubbleText}>{item.content}</Text>
                          </View>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={screenStyles.emptySubtitle}>No comments yet. Start the conversation!</Text>}
                    />
                }
                <View style={commentStyles.inputRow}>
                  <Avatar name={profile?.name || 'Me'} uri={profile?.avatar_url} size={32} />
                  <TextInput
                    style={commentStyles.input} placeholder="Add a comment…"
                    value={newComment} onChangeText={setNewComment} multiline
                  />
                  <TouchableOpacity
                    style={[commentStyles.sendBtn, !newComment.trim() && { opacity: 0.4 }]}
                    onPress={handleAddComment} disabled={!newComment.trim()}
                  >
                    <Send color="#fff" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Lightbox ── */}
        <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
          <View style={lightboxStyles.bg}>
            <TouchableOpacity style={lightboxStyles.close} onPress={() => setLightboxVisible(false)}>
              <X color="#fff" size={26} />
            </TouchableOpacity>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              contentOffset={{ x: lightboxIndex * SCREEN_WIDTH, y: 0 }}>
              {lightboxImages.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width: SCREEN_WIDTH, height: '100%' }} resizeMode="contain" />
              ))}
            </ScrollView>
            <Text style={lightboxStyles.counter}>{lightboxIndex + 1} / {lightboxImages.length}</Text>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── StyleSheets ──────────────────────────────────────────────────────────────

const screenStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.secondary, textAlign: 'center', lineHeight: 20 },
});

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  headerText: { flex: 1 },
  author: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  time: { fontSize: 12, color: COLORS.secondary, marginTop: 1 },
  content: { fontSize: 15, color: COLORS.primary, lineHeight: 22, marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#EEF0FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, color: '#4834DF', fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingBottom: 30 },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const composerStyles = StyleSheet.create({
  typeRow: { paddingVertical: 12 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  typeChipText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  authorName: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  mainInput: { fontSize: 16, color: COLORS.primary, minHeight: 80, textAlignVertical: 'top', lineHeight: 24 },
  charCount: { textAlign: 'right', color: COLORS.secondary, fontSize: 11, marginBottom: 8 },
  section: { marginTop: 12, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 4 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.primary, borderWidth: 1, borderColor: '#E5E7EB' },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollInput: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.primary, borderWidth: 1, borderColor: '#E5E7EB' },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  addOptionText: { color: '#4834DF', fontWeight: '600', fontSize: 14 },
  toggleRow: { flexDirection: 'row', gap: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { fontSize: 13, color: COLORS.primary },
  row: { flexDirection: 'row', gap: 8 },
  coverPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D1FAE5', borderStyle: 'dashed', overflow: 'hidden' },
  coverPreview: { width: '100%', height: 140, borderRadius: 10 },
  coverText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
  imgPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF0FF', borderRadius: 12, padding: 12 },
  imgPickerText: { color: '#4834DF', fontWeight: '600', fontSize: 14 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 3 },
});

const commentStyles = StyleSheet.create({
  postSummary: { marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 14, borderLeftWidth: 3, borderLeftColor: '#4834DF' },
  summaryAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  summaryContent: { fontSize: 13, color: COLORS.secondary, lineHeight: 18 },
  item: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  bubble: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 10 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  bubbleAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.primary, flex: 1 },
  bubbleTime: { fontSize: 11, color: COLORS.secondary },
  bubbleText: { fontSize: 14, color: COLORS.primary, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.primary, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});

const lightboxStyles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 },
  counter: { position: 'absolute', bottom: 40, alignSelf: 'center', color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
});
