import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function QuestionnaireScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Failed to load questions.');
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !user) return;

    setSubmitting(true);
    const question = questions[currentIdx];

    const { error } = await supabase
      .from('user_answers')
      .upsert({
        user_id: user.id,
        question_id: question.id,
        answer_value: selectedOption,
      });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setSelectedOption(null);
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>No questions available right now. You can skip this for now.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentIdx];
  const options = currentQuestion.options || [
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
          <Text style={styles.progressText}>Question {currentIdx + 1} of {questions.length}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.questionTitle}>{currentQuestion.text}</Text>
          <Text style={styles.questionSubtitle}>This helps us find the best matches for you.</Text>

          <View style={styles.optionsContainer}>
            {options.map((option: string, index: number) => (
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
            style={[styles.button, (selectedOption === null || submitting) && styles.buttonDisabled]}
            disabled={selectedOption === null || submitting}
            onPress={handleSubmitAnswer}
          >
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>
              {currentIdx < questions.length - 1 ? 'Next' : 'Finish'}
            </Text>}
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
