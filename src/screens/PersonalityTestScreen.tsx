import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Zap, Target, Users, Award } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

// ─── Personality type classification ─────────────────────────────────────────
// Questions 1,4,7,8 (0-indexed: 0,3,6,7) are "social" dimension
// Questions 3,5,6,10 (0-indexed: 2,4,5,9) are "action" dimension
// Option index 0 → most proactive/social (+2), 3 → least (-2)
const OPTION_VALUES = [2, 1, -1, -2];
const SOCIAL_Q_INDICES  = [0, 3, 6, 7];
const ACTION_Q_INDICES  = [2, 4, 5, 9];

function classifyPersonality(answers: number[]) {
  // answers[i] = selected option index (0-3) for question i
  const vals = answers.map(idx => OPTION_VALUES[idx] ?? 0);
  const actionScore = ACTION_Q_INDICES.reduce((s, i) => s + (vals[i] ?? 0), 0);
  const socialScore = SOCIAL_Q_INDICES.reduce((s, i) => s + (vals[i] ?? 0), 0);
  const totalScore  = vals.reduce((a, b) => a + b, 0);

  let type = '';
  let desc = '';
  if (actionScore > 0 && socialScore > 0) {
    type = 'Trailblazer';
    desc = 'The Campus Main Character. You\'re confident, energetic, and always where the action is. You lead the way and turn every group project into a win!';
  } else if (actionScore > 0 && socialScore <= 0) {
    type = 'Reflective Strategist';
    desc = 'The Low-Key Visionary. You\'ve got the plan and the drive, but you\'re doing it your way. You\'re proactive, insightful, and probably already three steps ahead.';
  } else if (actionScore <= 0 && socialScore > 0) {
    type = 'Social Drifter';
    desc = 'The Vibe Ambassador. You\'re all about the people and the energy, going with the flow and making sure every hangout stays immaculate.';
  } else {
    type = 'Reserved Drifter';
    desc = 'The Ultimate Stoic. You\'re easygoing and prefer the peace of your own world. You avoid the drama and the chaos, staying perfectly chill in your own lane.';
  }

  return { totalScore, actionScore, socialScore, type, desc };
}

export default function PersonalityTestScreen() {
  const navigation = useNavigation<any>();
  const { user, fetchProfile } = useAuthStore();

  const [questions, setQuestions]   = useState<any[]>([]);
  const [loadingQ, setLoadingQ]     = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  // answers[i] = selected option index (0-3) for question i
  const [answers, setAnswers]       = useState<(number | undefined)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !data?.length) {
      Alert.alert('Error', 'Could not load questions. Please try again.');
      navigation.goBack();
      return;
    }
    setQuestions(data);
    setAnswers(new Array(data.length).fill(undefined));
    setLoadingQ(false);
  };

  const handleSelect = (optionIndex: number) => {
    const updated = [...answers];
    updated[currentIdx] = optionIndex;
    setAnswers(updated);
  };

  const saveResults = async () => {
    if (!user) return;
    setSaving(true);

    const filledAnswers = answers as number[];
    const result = classifyPersonality(filledAnswers);

    // 1. Update personality type on the users row
    const { error: profileErr } = await supabase
      .from('users')
      .update({
        personality_type:           result.type,
        total_score:                result.totalScore,
        action_score:               result.actionScore,
        social_emotional_score:     result.socialScore,
        completed_personality_at:   new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileErr) {
      Alert.alert('Error', `Failed to save profile: ${profileErr.message}`);
      setSaving(false);
      return;
    }

    // 2. Save each answer to user_answers (delete-first for idempotency)
    await supabase.from('user_answers').delete().eq('user_id', user.id);

    const rows = questions.map((q, i) => ({
      user_id:      user.id,
      question_id:  q.id,
      answer_value: filledAnswers[i],   // option index 0-3
    }));

    const { error: answersErr } = await supabase
      .from('user_answers')
      .insert(rows);

    if (answersErr) {
      console.warn('Answers save error:', answersErr.message);
      // Non-fatal — personality type already saved
    }

    await fetchProfile();
    navigation.navigate('MainTabs');
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loadingQ) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ─── Result screen ─────────────────────────────────────────────────────────
  if (showResult) {
    const result = classifyPersonality(answers as number[]);
    return (
      <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            <Award color={COLORS.primary} size={80} style={{ alignSelf: 'center', marginBottom: 20 }} />
            <Text style={styles.resultTitle}>You are a {result.type}!</Text>
            <Text style={styles.resultDesc}>{result.desc}</Text>

            <View style={styles.scoreGrid}>
              <View style={styles.scoreCard}>
                <Zap color={COLORS.primary} size={24} />
                <Text style={styles.scoreVal}>{result.totalScore}</Text>
                <Text style={styles.scoreLabel}>Total Score</Text>
              </View>
              <View style={styles.scoreCard}>
                <Target color={COLORS.primary} size={24} />
                <Text style={styles.scoreVal}>{result.actionScore}</Text>
                <Text style={styles.scoreLabel}>Action</Text>
              </View>
              <View style={styles.scoreCard}>
                <Users color={COLORS.primary} size={24} />
                <Text style={styles.scoreVal}>{result.socialScore}</Text>
                <Text style={styles.scoreLabel}>Social</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={saveResults} disabled={saving}>
              {saving
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>Add to Profile</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Question screen ───────────────────────────────────────────────────────
  const q      = questions[currentIdx];
  const opts   = (q?.options as string[]) || [];
  const total  = questions.length;

  return (
    <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft color={COLORS.primary} size={28} />
          </TouchableOpacity>
          <Text style={styles.progressText}>Question {currentIdx + 1} of {total}</Text>
        </View>

        <View style={styles.testContent}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentIdx + 1) / total) * 100}%` }]} />
          </View>

          <Text style={styles.questionText}>{q?.text}</Text>

          {opts.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.optionCard, answers[currentIdx] === i && styles.optionSelected]}
              onPress={() => handleSelect(i)}
            >
              <Text style={[styles.optionText, answers[currentIdx] === i && styles.optionTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.button, answers[currentIdx] === undefined && styles.buttonDisabled]}
            disabled={answers[currentIdx] === undefined}
            onPress={() => {
              if (currentIdx < total - 1) {
                setCurrentIdx(currentIdx + 1);
              } else {
                setShowResult(true);
              }
            }}
          >
            <Text style={styles.buttonText}>
              {currentIdx === total - 1 ? 'View Results' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundTop },
  container:     { flex: 1 },
  safeArea:      { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 20 },
  progressText:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, marginRight: 28 },
  testContent:   { flex: 1, paddingHorizontal: 20 },
  progressBar:   { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginBottom: 40 },
  progressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  questionText:  { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 30 },
  optionCard:    { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 2, borderColor: 'transparent' },
  optionSelected:{ borderColor: COLORS.primary, backgroundColor: '#F0F8FA' },
  optionText:    { fontSize: 16, color: COLORS.primary },
  optionTextSelected: { fontWeight: 'bold' },
  button:        { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 20 },
  buttonDisabled:{ backgroundColor: COLORS.secondary, opacity: 0.5 },
  buttonText:    { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  resultContent: { padding: 30, alignItems: 'center' },
  resultTitle:   { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 15 },
  resultDesc:    { fontSize: 16, color: COLORS.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  scoreGrid:     { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  scoreCard:     { backgroundColor: COLORS.white, padding: 15, borderRadius: 20, alignItems: 'center', width: '30%', elevation: 3 },
  scoreVal:      { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginVertical: 5 },
  scoreLabel:    { fontSize: 10, color: COLORS.secondary, fontWeight: 'bold', textTransform: 'uppercase' },
});