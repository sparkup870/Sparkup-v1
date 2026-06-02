import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function TermsScreen() {
  const navigation = useNavigation<any>();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const arrowOpacity = useRef(new Animated.Value(1)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      Animated.timing(arrowOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleAccept = () => {
    navigation.navigate('ProfileSetup');
  };

  const handleDecline = () => {
    navigation.navigate('Welcome');
  };

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <ShieldCheck color={COLORS.primary} size={32} />
          </View>
          <Text style={styles.headerTitle}>Before You Continue</Text>
          <Text style={styles.headerSubtitle}>
            Please read our disclaimer and terms carefully before creating your profile.
          </Text>
        </View>

        {/* Scroll indicator */}
        <Animated.View style={[styles.scrollHint, { opacity: arrowOpacity }]}>
          <ChevronDown color={COLORS.secondary} size={18} />
          <Text style={styles.scrollHintText}>Scroll to read all terms</Text>
        </Animated.View>

        {/* Terms content */}
        <View style={styles.cardWrapper}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Disclaimer */}
            <View style={styles.sectionHeader}>
              <AlertTriangle color="#E07B39" size={18} />
              <Text style={styles.sectionTitle}>Disclaimer</Text>
            </View>
            <Text style={styles.body}>
              SparkUp is a social networking platform designed exclusively for verified college students.
              By using this app, you acknowledge that all interactions, connections, and content shared
              are your sole responsibility.
            </Text>
            <Text style={styles.body}>
              SparkUp does not conduct background checks on its users. We strongly encourage you to exercise
              caution when sharing personal information or agreeing to meet someone in person. Always
              meet in public places and inform a trusted person of your plans.
            </Text>
            <Text style={styles.body}>
              SparkUp is not liable for any incidents, harm, or disputes arising from interactions
              between users on or off the platform.
            </Text>

            <View style={styles.divider} />

            {/* Age Confirmation */}
            <View style={styles.sectionHeader}>
              <ShieldCheck color={COLORS.primary} size={18} />
              <Text style={styles.sectionTitle}>Age Requirement</Text>
            </View>
            <Text style={styles.body}>
              You must be <Text style={styles.bold}>18 years of age or older</Text> to use SparkUp.
              By accepting these terms, you confirm that you meet this age requirement. Users found
              to be under 18 will have their accounts permanently removed without notice.
            </Text>

            <View style={styles.divider} />

            {/* Terms of Use */}
            <View style={styles.sectionHeader}>
              <ShieldCheck color={COLORS.primary} size={18} />
              <Text style={styles.sectionTitle}>Terms of Use</Text>
            </View>
            <Text style={styles.bodyBold}>1. Eligibility</Text>
            <Text style={styles.body}>
              You must be a currently enrolled college student with a valid college email address.
              Creating fake accounts or impersonating others is strictly prohibited and may result
              in immediate account termination.
            </Text>

            <Text style={styles.bodyBold}>2. Acceptable Use</Text>
            <Text style={styles.body}>
              You agree not to use SparkUp to harass, stalk, threaten, or harm other users.
              Sharing explicit, offensive, or illegal content is strictly prohibited. Any misuse
              may result in permanent account suspension and/or reporting to law enforcement.
            </Text>

            <Text style={styles.bodyBold}>3. Privacy & Data</Text>
            <Text style={styles.body}>
              Your profile photo will appear blurred to others until a mutual match is established.
              SparkUp collects minimal personal data solely for the purpose of operating the platform.
              We do not sell your data to third parties.
            </Text>

            <Text style={styles.bodyBold}>4. User Responsibility</Text>
            <Text style={styles.body}>
              You are solely responsible for any content you post, messages you send, and actions
              you take on the platform. SparkUp acts only as a facilitator and is not responsible
              for the conduct of its users.
            </Text>

            <Text style={styles.bodyBold}>5. Reporting & Safety</Text>
            <Text style={styles.body}>
              If you encounter a user who is acting inappropriately or making you feel unsafe,
              please use the in-app report feature immediately. SparkUp takes all reports seriously
              and investigates them promptly.
            </Text>

            <Text style={styles.bodyBold}>6. Modifications</Text>
            <Text style={styles.body}>
              SparkUp reserves the right to modify these terms at any time. Continued use of the
              app after changes constitutes acceptance of the new terms.
            </Text>

            <View style={styles.divider} />

            {/* Acknowledgement box */}
            <View style={styles.acknowledgementBox}>
              <Text style={styles.acknowledgementText}>
                By tapping <Text style={styles.bold}>"I Agree & Continue"</Text>, you confirm that:
              </Text>
              <Text style={styles.bulletPoint}>• You are 18 years of age or older</Text>
              <Text style={styles.bulletPoint}>• You have read and understood these terms</Text>
              <Text style={styles.bulletPoint}>• You accept full responsibility for your actions on SparkUp</Text>
            </View>
          </ScrollView>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              !hasScrolledToBottom && styles.acceptButtonDisabled,
            ]}
            onPress={handleAccept}
            disabled={!hasScrolledToBottom}
          >
            <Text style={styles.acceptText}>
              {hasScrolledToBottom ? 'I Agree & Continue' : 'Scroll to Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: SIZES.padding },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Scroll hint
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  scrollHintText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontStyle: 'italic',
  },

  // Card
  cardWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: 18,
  },

  // Text styles
  body: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Acknowledgement
  acknowledgementBox: {
    backgroundColor: 'rgba(11,29,58,0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  acknowledgementText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 22,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  declineText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
