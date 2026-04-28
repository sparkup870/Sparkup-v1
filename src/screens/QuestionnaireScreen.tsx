import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function QuestionnaireScreen() {
  const navigation = useNavigation<any>();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const OPTIONS = [
    'Staying in and watching a movie',
    'Going out to a loud party',
    'Exploring a new part of the city',
    'Playing video games with friends'
  ];

  return (
    <LinearGradient
      colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={COLORS.primary} size={28} />
          </TouchableOpacity>
          <Text style={styles.progressText}>Question 1 of 10</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.questionTitle}>What is your ideal Friday night?</Text>
          <Text style={styles.questionSubtitle}>This helps us find the best matches for you.</Text>

          <View style={styles.optionsContainer}>
            {OPTIONS.map((option, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.optionCard, 
                  selectedOption === index && styles.optionCardSelected
                ]}
                onPress={() => setSelectedOption(index)}
              >
                <View style={[styles.radioCircle, selectedOption === index && styles.radioCircleSelected]}>
                  {selectedOption === index && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionText, selectedOption === index && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.button, selectedOption === null && styles.buttonDisabled]}
            disabled={selectedOption === null}
            onPress={() => {
              // Usually goes to next question, but for dummy we just go to MainTabs
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }}
          >
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  progressText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginRight: 40, // offset back button to center text
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
    lineHeight: 36,
  },
  questionSubtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 40,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F8FA', // Light tint
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.primary,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: COLORS.secondary,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
