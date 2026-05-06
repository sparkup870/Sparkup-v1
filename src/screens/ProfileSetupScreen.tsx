import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const { user, fetchProfile } = useAuthStore();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        const sizeInMB = (asset.base64.length * (3 / 4)) / (1024 * 1024);
        if (sizeInMB > 10) {
          Alert.alert('Image too large', 'Please select an image smaller than 10MB.');
          return;
        }
      }
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !bio.trim()) {
      Alert.alert('Missing Info', 'Please provide at least your name and bio.');
      return;
    }

    if (!user) return;

    setLoading(true);
    
    try {
      const emailDomain = user.email?.split('@')[1] || '';
      
      let uploadedAvatarUrl = 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70);
      if (imageBase64) {
        const fileExt = imageUri?.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(imageBase64), {
            contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
          });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        uploadedAvatarUrl = publicUrlData.publicUrl;
      }
      
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          university_domain: emailDomain,
          name: name.trim(),
          anonymous_id: `User#${Math.floor(1000 + Math.random() * 9000)}`,
          bio: bio.trim(),
          avatar_url: uploadedAvatarUrl,
          is_verified: true, // Auto-verifying for MVP
        }, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      await fetchProfile(); // Refresh store
      
      // Navigate to Questionnaire
      navigation.navigate('Questionnaire');
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft color={COLORS.primary} size={28} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Your image will be blurred to others until you mutually match and unlock.</Text>

            <TouchableOpacity style={styles.avatarPlaceholder} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: 120, height: 120, borderRadius: 60 }} />
              ) : (
                <>
                  <Camera color={COLORS.secondary} size={40} />
                  <Text style={styles.avatarText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Julia"
              placeholderTextColor={COLORS.secondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Short Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor={COLORS.secondary}
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
            />

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 20,
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  avatarText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
