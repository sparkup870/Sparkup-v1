import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Heart } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

const POSTS = [
  { id: '1', author: 'User#1234', content: 'Anyone want to team up for the weekend hackathon? Looking for a frontend dev!', time: '2h ago', likes: 12, comments: 3 },
  { id: '2', author: 'User#9876', content: 'The coffee at the library cafe is literally keeping me alive during finals week ☕️😭', time: '4h ago', likes: 45, comments: 8 },
  { id: '3', author: 'User#4512', content: 'Lost my AirPods case near the student union. If anyone found it, please let me know!', time: '5h ago', likes: 2, comments: 0 },
];

export default function PostsScreen() {
  const renderItem = ({ item }: { item: typeof POSTS[0] }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarPlaceholder} />
        <View>
          <Text style={styles.author}>{item.author}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton}>
          <Heart color={COLORS.secondary} size={18} />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MessageSquare color={COLORS.secondary} size={18} />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Campus Feed</Text>
        </View>

        <FlatList
          data={POSTS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Action Button for New Post */}
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 100,
  },
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundTop,
    marginRight: 10,
  },
  author: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontSize: 16,
  },
  time: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  content: {
    color: COLORS.primary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: COLORS.secondary,
    marginLeft: 5,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  fabIcon: {
    color: COLORS.white,
    fontSize: 30,
    lineHeight: 32,
  },
});
