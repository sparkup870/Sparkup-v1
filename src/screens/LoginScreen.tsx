import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (!emailDomain) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Bypass logic for test accounts
    if (emailDomain === 'bmscetest.com') {
      setLoading(true);
      const testPassword = 'BmsceTestUser!2026';
      
      // Try to sign in first
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: testPassword,
      });

      // If user doesn't exist, sign them up
      if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: testPassword,
        });
        error = signUpError;
        data = signUpData as any;
      }

      setLoading(false);

      if (error) {
        Alert.alert('Test Login Error', error.message + '\n\nNote: If "Confirm Email" is enabled in Supabase, auto-login might fail for new test accounts.');
      } else if (data?.session) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.session.user.id)
          .single();
          
        if (existingProfile) {
          navigation.navigate('MainTabs');
        } else {
          navigation.navigate('ProfileSetup');
        }
      }
      return;
    }

    // Domain validation for real users
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    
    if (genericDomains.includes(emailDomain)) {
      Alert.alert('Invalid Email', 'Personal email addresses are not allowed. Please use your verified college email.');
      return;
    }

    if (!emailDomain.endsWith('.edu') && !emailDomain.includes('college')) {
      Alert.alert('Invalid Email', 'Please use a valid college email address ending in .edu');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: undefined,
      }
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOtpSent(true);
      Alert.alert('Code Sent', 'Please check your email for the verification code.');
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });
    setLoading(false);

    if (error) {
      // Try 'login' type if 'signup' fails
      setLoading(true);
      const { data: { session: loginSession }, error: loginError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'login',
      });
      setLoading(false);

      if (loginError) {
        Alert.alert('Error', loginError.message);
        return;
      }
      
      if (loginSession) {
        navigation.navigate('MainTabs');
      }
    } else if (session) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single();
        
      if (existingProfile) {
        navigation.navigate('MainTabs');
      } else {
        navigation.navigate('ProfileSetup');
      }
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft color={COLORS.primary} size={28} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {!otpSent ? (
              <>
                <Text style={styles.title}>What's your college email?</Text>
                <Text style={styles.subtitle}>We use this to verify you are a student. Your email will be kept private.</Text>

                <TextInput
                  style={styles.input}
                  placeholder="name@college.edu"
                  placeholderTextColor={COLORS.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  disabled={loading}
                />

                <TouchableOpacity 
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Send Verification Code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Enter the code</Text>
                <Text style={styles.subtitle}>We've sent a 6-digit code to {email}.</Text>

                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={COLORS.secondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  disabled={loading}
                />

                <TouchableOpacity 
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ marginTop: 20, alignSelf: 'center' }}
                  onPress={() => setOtpSent(false)}
                >
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Change Email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    lineHeight: 24,
    marginBottom: 40,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
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
