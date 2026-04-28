import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

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
            <TouchableOpacity style={styles.iconCircle}>
              <Search color={COLORS.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileCircle}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/100?img=1' }} 
                style={styles.profileImage} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80' }} 
              style={styles.cardImage} 
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.cardOverlay}
            >
              <View style={styles.badgeLike}>
                <Text style={styles.badgeLikeText}>She likes you!</Text>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.locationBadge}>
                  <MapPin color={COLORS.white} size={14} />
                  <Text style={styles.locationText}>California</Text>
                </View>
                
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>Julia</Text>
                  <Text style={styles.ageText}>27</Text>
                </View>

                <Text style={styles.bioText} numberOfLines={2}>
                  Hey there 👋. My name is Julia and I'm a fashion photographer. I love going to concerts and festivals.
                </Text>

                <View style={styles.chipsRow}>
                  {['Aries', 'Photography', 'Fashion', 'Music'].map((chip, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Simulate Swipe / Match action */}
        <TouchableOpacity 
          style={{ position: 'absolute', bottom: 120, alignSelf: 'center', backgroundColor: COLORS.white, padding: 15, borderRadius: 30 }}
          onPress={() => navigation.navigate('MatchModal')}
        >
          <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Simulate Match</Text>
        </TouchableOpacity>

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
    paddingBottom: 100, // Space for tabs
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
    justifyContent: 'space-between',
    padding: 20,
  },
  badgeLike: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeLikeText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
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
  ageText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 5,
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
});
