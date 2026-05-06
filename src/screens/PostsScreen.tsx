import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Heart, Send, X, Plus, Trash2 } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function PostsScreen() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
    if (user) fetchUserLikes();
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_comments(id)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setCommentLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleOpenComments = (post: any) => {
    setSelectedPost(post);
    setComments([]);
    setIsCommentModalVisible(true);
    fetchComments(post.id);
  };

  const handleCreateComment = async () => {
    if (!newCommentContent.trim() || !user || !selectedPost) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: selectedPost.id,
          user_id: user.id,
          author_name: profile?.name || 'Anonymous',
          content: newCommentContent.trim()
        });

      if (error) throw error;

      setNewCommentContent('');
      fetchComments(selectedPost.id);
      fetchPosts(); // Refresh comment counts
    } catch (error: any) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to remove this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
              if (error) throw error;
              if (selectedPost) fetchComments(selectedPost.id);
              fetchPosts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);
    
    if (!error && data) {
      setUserLikes(new Set(data.map(l => l.post_id)));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!user) return;

    const isLiked = userLikes.has(postId);
    const newLikesCount = isLiked ? currentLikes - 1 : currentLikes + 1;

    // Optimistic UI update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: newLikesCount } : p));
    const newUserLikes = new Set(userLikes);
    if (isLiked) newUserLikes.delete(postId); else newUserLikes.add(postId);
    setUserLikes(newUserLikes);

    try {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
      
      await supabase.from('posts').update({ likes_count: newLikesCount }).eq('id', postId);
    } catch (error) {
      console.error('Like error:', error);
      fetchPosts(); // Rollback on error
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          author_name: profile?.name || 'Anonymous',
          content: newPostContent.trim(),
          likes_count: 0
        });

      if (error) throw error;

      setNewPostContent('');
      setIsModalVisible(false);
      fetchPosts();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{(item.author_name || 'A')[0]}</Text>
        </View>
        <View>
          <Text style={styles.author}>{item.author_name || 'Anonymous'}</Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleLike(item.id, item.likes_count)}
        >
          <Heart 
            color={userLikes.has(item.id) ? '#FF4757' : COLORS.secondary} 
            fill={userLikes.has(item.id) ? '#FF4757' : 'transparent'} 
            size={18} 
          />
          <Text style={[styles.actionText, userLikes.has(item.id) && { color: '#FF4757' }]}>
            {item.likes_count || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenComments(item)}>
          <MessageSquare color={COLORS.secondary} size={18} />
          <Text style={styles.actionText}>
            {item.post_comments?.length || 0} Comments
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Campus Feed</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts yet. Be the first to share something!</Text>
            }
          />
        )}

        <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
          <Plus color={COLORS.white} size={30} />
        </TouchableOpacity>

        {/* New Post Modal */}
        <Modal visible={isModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X color={COLORS.primary} size={24} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>New Post</Text>
                <TouchableOpacity onPress={handleCreatePost} disabled={!newPostContent.trim()}>
                  <Send color={newPostContent.trim() ? COLORS.primary : COLORS.secondary} size={24} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="What's happening on campus?"
                multiline
                autoFocus
                value={newPostContent}
                onChangeText={setNewPostContent}
                maxLength={280}
              />
              <Text style={styles.charCount}>{newPostContent.length}/280</Text>
            </View>
          </View>
        </Modal>

        {/* Comments Modal */}
        <Modal visible={isCommentModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '90%' }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setIsCommentModalVisible(false)}>
                  <X color={COLORS.primary} size={24} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Discussion</Text>
                <View style={{ width: 24 }} />
              </View>

              {selectedPost && (
                <View style={styles.selectedPostSummary}>
                  <Text style={styles.selectedPostAuthor}>{selectedPost.author_name}</Text>
                  <Text style={styles.selectedPostContent}>{selectedPost.content}</Text>
                </View>
              )}

              {commentLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.commentAuthor}>{item.author_name}</Text>
                          <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
                        </View>
                        {user?.id === item.user_id && (
                          <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                            <Trash2 color="#FF4757" size={16} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{item.content}</Text>
                    </View>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No comments yet. Start the conversation!</Text>
                  }
                />
              )}

              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={newCommentContent}
                  onChangeText={setNewCommentContent}
                  multiline
                />
                <TouchableOpacity 
                  onPress={handleCreateComment}
                  disabled={!newCommentContent.trim()}
                  style={[styles.sendCommentBtn, !newCommentContent.trim() && { opacity: 0.5 }]}
                >
                  <Send color={COLORS.white} size={18} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: SIZES.padding, paddingTop: 20, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  listContent: { paddingHorizontal: SIZES.padding, paddingBottom: 120 },
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(72, 52, 223, 0.1)',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.primary, fontWeight: 'bold' },
  author: { fontWeight: 'bold', color: COLORS.primary, fontSize: 16 },
  time: { color: COLORS.secondary, fontSize: 12 },
  content: { color: COLORS.primary, fontSize: 15, lineHeight: 22, marginBottom: 15 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 25 },
  actionText: { color: COLORS.secondary, marginLeft: 6, fontWeight: '600', fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  modalInput: { fontSize: 18, color: COLORS.primary, minHeight: 150, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', color: COLORS.secondary, fontSize: 12, marginTop: 10 },
  emptyText: { textAlign: 'center', color: COLORS.secondary, marginTop: 50, fontSize: 16 },
  selectedPostSummary: { padding: 15, backgroundColor: 'rgba(72, 52, 223, 0.05)', borderRadius: 15, marginBottom: 20 },
  selectedPostAuthor: { fontWeight: 'bold', color: COLORS.primary, marginBottom: 5, fontSize: 14 },
  selectedPostContent: { color: COLORS.primary, fontSize: 14, opacity: 0.8 },
  commentItem: { marginBottom: 20, borderLeftWidth: 2, borderLeftColor: 'rgba(72, 52, 223, 0.2)', paddingLeft: 15 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  commentAuthor: { fontWeight: 'bold', color: COLORS.primary, fontSize: 14 },
  commentTime: { color: COLORS.secondary, fontSize: 11 },
  commentContent: { color: COLORS.primary, fontSize: 14, lineHeight: 20 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15, paddingBottom: 10 },
  commentInput: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 14, color: COLORS.primary, marginRight: 10, maxHeight: 100 },
  sendCommentBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
