import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MessageCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function MatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useAuthStore();
  
  const { otherUser, match } = route.params || { 
    otherUser: { name: 'Julia', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80' },
    match: { compatibility_score: 85 }
  };

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <X color={COLORS.primary} size={24} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.imagesContainer}>
            {/* User 1 Image (Background) */}
            <Image 
              source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80' }} 
              style={[styles.imageCard, styles.imageCardLeft]} 
            />
            {/* User 2 Image (Foreground) */}
            <Image 
              source={{ uri: otherUser.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80' }} 
              style={[styles.imageCard, styles.imageCardRight]} 
            />
            {/* Heart Icon in middle */}
            <View style={styles.heartCircle}>
              <View style={styles.heartShape} />
            </View>
          </View>

          <Text style={styles.matchTitle}>You matched!</Text>
          <Text style={styles.matchSubtitle}>You and {otherUser.name} have a {match.compatibility_score}% compatibility spark!</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.messageButton} onPress={() => navigation.navigate('ChatsTab' as never)}>
            <MessageCircle color={COLORS.primary} size={28} />
          </TouchableOpacity>
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  imagesContainer: {
    width: 300,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  imageCard: {
    width: 140,
    height: 180,
    borderRadius: 20,
    position: 'absolute',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  imageCardLeft: {
    left: 20,
    transform: [{ rotate: '-10deg' }],
    zIndex: 1,
  },
  imageCardRight: {
    right: 20,
    top: 20,
    transform: [{ rotate: '5deg' }],
    zIndex: 2,
  },
  heartCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    position: 'absolute',
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  heartShape: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.notification, // Or a distinct blue for the heart as per design
    borderRadius: 10,
    // Note: To make a proper heart we can use SVG or an Icon, for simplicity we use a blue circle simulating the icon in the design.
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  matchSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  messageButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 15,
    elevation: 5,
  },
});
