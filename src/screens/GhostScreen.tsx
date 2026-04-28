import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Camera, Clock } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function GhostScreen() {
  const [unlockCode, setUnlockCode] = useState('');

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Ghost Mode 👻</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Find them in real life to unlock their profile instantly.</Text>

          {/* Active Ghost Session Card */}
          <View style={styles.card}>
            <View style={styles.timerBadge}>
              <Clock color={COLORS.white} size={14} />
              <Text style={styles.timerText}>14:23 remaining</Text>
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80' }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardOverlay}>
              <View style={styles.locationTag}>
                <MapPin color={COLORS.white} size={14} />
                <Text style={styles.locationText}>Campus Library, 2nd Floor</Text>
              </View>
            </View>
          </View>

          {/* Unlock Section */}
          <View style={styles.unlockSection}>
            <Text style={styles.unlockTitle}>Found them?</Text>
            <Text style={styles.unlockDesc}>Ask for their unique code to reveal their identity.</Text>
            
            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input}
                placeholder="Enter 4-digit code"
                placeholderTextColor={COLORS.secondary}
                keyboardType="number-pad"
                maxLength={4}
                value={unlockCode}
                onChangeText={setUnlockCode}
              />
              <TouchableOpacity style={styles.verifyButton}>
                <Text style={styles.verifyText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Start Own Session */}
          <TouchableOpacity style={styles.startButton}>
            <Camera color={COLORS.primary} size={24} style={{ marginRight: 10 }} />
            <Text style={styles.startButtonText}>Drop a Ghost Pin</Text>
          </TouchableOpacity>

        </ScrollView>
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
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 100, // Bottom tab clearance
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    height: 350,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  timerBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 2,
  },
  timerText: {
    color: COLORS.white,
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slight darkening
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  locationText: {
    color: COLORS.white,
    marginLeft: 6,
    fontWeight: '600',
  },
  unlockSection: {
    marginBottom: 30,
  },
  unlockTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  unlockDesc: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
    textAlign: 'center',
    letterSpacing: 2,
  },
  verifyButton: {
    backgroundColor: COLORS.notification,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    justifyContent: 'center',
    shadowColor: COLORS.notification,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  verifyText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  startButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
