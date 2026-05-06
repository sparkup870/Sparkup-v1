import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Zap, Target, Users, Award } from 'lucide-react-native';
import { COLORS, SIZES } from '../constants/theme';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/useAuthStore';

const QUESTIONS = [
    {
        id: 1, text: "At a college fest or party, you usually:", options: [
            { label: "Move around, meet new people, and start conversations", value: 2 },
            { label: "Stick with friends but chat with others too", value: 1 },
            { label: "Chill with a small familiar group", value: -1 },
            { label: "Stay for a bit, then quietly leave", value: -2 }
        ], type: 'social'
    },
    {
        id: 2, text: "When choosing what to do this weekend, you:", options: [
            { label: "Plan something exciting and make it happen", value: 2 },
            { label: "Have a rough plan but stay flexible", value: 1 },
            { label: "Decide based on mood at the last minute", value: -1 },
            { label: "Wait for friends to decide", value: -2 }
        ], type: 'general'
    },
    {
        id: 3, text: "You didn’t do well on a test or assignment. You:", options: [
            { label: "Immediately plan how to improve next time", value: 2 },
            { label: "Think about what went wrong and adjust", value: 1 },
            { label: "Feel bad for a while before moving on", value: -1 },
            { label: "Avoid thinking about it", value: -2 }
        ], type: 'action'
    },
    {
        id: 4, text: "A friend gives you honest feedback about yourself. You:", options: [
            { label: "Appreciate it and try to improve", value: 2 },
            { label: "Listen if it makes sense", value: 1 },
            { label: "Overthink it later", value: -1 },
            { label: "Get annoyed or defensive", value: -2 }
        ], type: 'social'
    },
    {
        id: 5, text: "During a stressful week (deadlines + exams), you:", options: [
            { label: "Make a plan and start working", value: 2 },
            { label: "Talk to friends or vent it out", value: 1 },
            { label: "Take some alone time to reset", value: -1 },
            { label: "Procrastinate and hope things work out", value: -2 }
        ], type: 'action'
    },
    {
        id: 6, text: "Your ideal college project/teamwork style is:", options: [
            { label: "Clear roles and organized planning", value: 2 },
            { label: "Some structure but relaxed vibes", value: 1 },
            { label: "Go with the flow and figure it out", value: -1 },
            { label: "Last-minute chaos but somehow works", value: -2 }
        ], type: 'action'
    },
    {
        id: 7, text: "When drama or conflict happens in your friend group, you:", options: [
            { label: "Address it directly and clear things up", value: 2 },
            { label: "Try to help everyone compromise", value: 1 },
            { label: "Stay neutral and avoid involvement", value: -1 },
            { label: "Let others deal with it", value: -2 }
        ], type: 'social'
    },
    {
        id: 8, text: "Sudden plan change? (Class cancelled, surprise trip, etc.)", options: [
            { label: "Love it — new adventure!", value: 2 },
            { label: "Adjust easily", value: 1 },
            { label: "Need some time to get used to it", value: -1 },
            { label: "Wish things stayed predictable", value: -2 }
        ], type: 'social'
    },
    {
        id: 9, text: "What motivates you the most in college life?", options: [
            { label: "Achievements, success, and recognition", value: 2 },
            { label: "Learning new things and self-growth", value: 1 },
            { label: "Comfort, good vibes, and stability", value: -1 },
            { label: "Rewards like money, perks, or benefits", value: -2 }
        ], type: 'general'
    },
    {
        id: 10, text: "When a plan completely fails (event cancelled, project issue), you:", options: [
            { label: "Take charge and fix what you can", value: 2 },
            { label: "Analyze what happened", value: 1 },
            { label: "Accept it as bad luck", value: -1 },
            { label: "Ignore it and move on", value: -2 }
        ], type: 'action'
    }
];

export default function PersonalityTestScreen() {
    const navigation = useNavigation<any>();
    const { user, fetchProfile } = useAuthStore();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSelect = (value: number) => {
        const newAnswers = [...answers];
        newAnswers[currentIdx] = value;
        setAnswers(newAnswers);
    };

    const calculateResult = () => {
        const totalScore = answers.reduce((a, b) => a + b, 0);
        const actionScore = answers[2] + answers[4] + answers[5] + answers[9];
        const socialScore = answers[0] + answers[3] + answers[6] + answers[7];

        let type = "";
        let desc = "";

        // Matrix Classification
        if (actionScore > 0 && socialScore > 0) {
            type = "Trailblazer";
            desc = "The Campus Main Character. You're confident, energetic, and always where the action is. You lead the way and turn every group project into a win!";
        } else if (actionScore > 0 && socialScore <= 0) {
            type = "Reflective Strategist";
            desc = "The Low-Key Visionary. You've got the plan and the drive, but you're doing it your way. You're proactive, insightful, and probably already three steps ahead.";
        } else if (actionScore <= 0 && socialScore > 0) {
            type = "Social Drifter";
            desc = "The Vibe Ambassador. You're all about the people and the energy, going with the flow and making sure every hangout stays immaculate.";
        } else {
            type = "Reserved Drifter";
            desc = "The Ultimate Stoic. You're easygoing and prefer the peace of your own world. You avoid the drama and the chaos, staying perfectly chill in your own lane.";
        }

        return { totalScore, actionScore, socialScore, type, desc };
    };

    const saveResults = async () => {
        if (!user) return;
        setLoading(true);
        const result = calculateResult();

        const { error } = await supabase
            .from('users')
            .update({
                personality_type: result.type,
                total_score: result.totalScore,
                action_score: result.actionScore,
                social_emotional_score: result.socialScore,
                completed_personality_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            Alert.alert("Error", "Failed to save results");
            setLoading(false);
        } else {
            await fetchProfile();
            navigation.navigate('MainTabs');
        }
    };

    if (showResult) {
        const result = calculateResult();
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

                        <TouchableOpacity style={styles.button} onPress={saveResults} disabled={loading}>
                            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Add to Profile</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    const q = QUESTIONS[currentIdx];

    return (
        <LinearGradient colors={[COLORS.backgroundTop, COLORS.backgroundBottom]} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color={COLORS.primary} size={28} /></TouchableOpacity>
                    <Text style={styles.progressText}>Question {currentIdx + 1} of 10</Text>
                </View>
                <View style={styles.testContent}>
                    <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${((currentIdx + 1) / 10) * 100}%` }]} /></View>
                    <Text style={styles.questionText}>{q.text}</Text>
                    {q.options.map((opt, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.optionCard, answers[currentIdx] === opt.value && styles.optionSelected]}
                            onPress={() => handleSelect(opt.value)}
                        >
                            <Text style={[styles.optionText, answers[currentIdx] === opt.value && styles.optionTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.button, answers[currentIdx] === undefined && styles.buttonDisabled]}
                        disabled={answers[currentIdx] === undefined}
                        onPress={() => currentIdx < 9 ? setCurrentIdx(currentIdx + 1) : setShowResult(true)}
                    >
                        <Text style={styles.buttonText}>{currentIdx === 9 ? "View Results" : "Next"}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    progressText: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, marginRight: 28 },
    testContent: { flex: 1, paddingHorizontal: 20 },
    progressBar: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginBottom: 40 },
    progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    questionText: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 30 },
    optionCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 2, borderColor: 'transparent' },
    optionSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F8FA' },
    optionText: { fontSize: 16, color: COLORS.primary },
    optionTextSelected: { fontWeight: 'bold' },
    button: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 20 },
    buttonDisabled: { backgroundColor: COLORS.secondary, opacity: 0.5 },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    resultContent: { padding: 30, alignItems: 'center' },
    resultTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 15 },
    resultDesc: { fontSize: 16, color: COLORS.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
    scoreGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
    scoreCard: { backgroundColor: COLORS.white, padding: 15, borderRadius: 20, alignItems: 'center', width: '30%', elevation: 3 },
    scoreVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginVertical: 5 },
    scoreLabel: { fontSize: 10, color: COLORS.secondary, fontWeight: 'bold', textTransform: 'uppercase' }
});