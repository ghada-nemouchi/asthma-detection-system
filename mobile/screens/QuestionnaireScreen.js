// screens/QuestionnaireScreen.js
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NHANES-style questions (from the metal dataset features)
const NHANES_QUESTIONS = [
    {
        id: 'wheezing',
        text: 'Have you had wheezing or whistling in your chest in the past year?',
        key: 'wheezing',
        weight: 3
    },
    {
        id: 'asthma_diagnosis',
        text: 'Has a doctor ever told you that you have asthma?',
        key: 'asthma_diagnosis',
        weight: 3
    },
    {
        id: 'night_symptoms',
        text: 'Do you wake up with chest tightness or coughing?',
        key: 'night_symptoms',
        weight: 2
    },
    {
        id: 'exercise_trigger',
        text: 'Does exercise or cold air trigger breathing problems?',
        key: 'exercise_trigger',
        weight: 2
    },
    {
        id: 'family_history',
        text: 'Does a close relative have asthma?',
        key: 'family_history',
        weight: 2
    },
    {
        id: 'smoking',
        text: 'Do you currently smoke cigarettes?',
        key: 'smoking',
        weight: 1,
        reverse: true  // Smoking increases risk
    },
    {
        id: 'rescue_use',
        text: 'Have you used a rescue inhaler in the past 12 months?',
        key: 'rescue_use',
        weight: 2
    }
];

const QuestionnaireScreen = ({ navigation, route }) => {
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    
    const onResult = route.params?.onResult;

    const toggleAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const calculateScore = () => {
        let totalWeight = 0;
        let weightedScore = 0;
        
        NHANES_QUESTIONS.forEach(q => {
            const answer = answers[q.id];
            if (answer !== undefined) {
                totalWeight += q.weight;
                if (answer === true) {
                    weightedScore += q.reverse ? 0 : q.weight;
                } else {
                    weightedScore += q.reverse ? q.weight : 0;
                }
            }
        });
        
        if (totalWeight === 0) return 0;
        return (weightedScore / totalWeight) * 100;
    };

    const handleSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < NHANES_QUESTIONS.length) {
            Alert.alert('Incomplete', `Please answer all ${NHANES_QUESTIONS.length} questions`);
            return;
        }
        
        const score = calculateScore();
        
        let severity = 'low';
        let message = '';
        let nextAction = 'healthy_exit';
        
        if (score >= 70) {
            severity = 'high';
            message = 'High probability of asthma based on questionnaire. Please consult a doctor.';
            nextAction = 'continue_to_app';
        } else if (score >= 40) {
            severity = 'moderate';
            message = 'Moderate probability. Consider monitoring your symptoms and consult a doctor.';
            nextAction = 'monitoring';
        } else if (score >= 20) {
            severity = 'mild';
            message = 'Mild suspicion. Monitor for any changes in symptoms.';
            nextAction = 'monitoring';
        } else {
            severity = 'low';
            message = 'Low probability of asthma. You appear healthy!';
            nextAction = 'healthy_exit';
        }
        
        const result = {
            success: true,
            questionnaire_score: score,
            severity: severity,
            message: message,
            next_action: nextAction,
            model: 'NHANES-based screener'
        };
        
        if (onResult) {
            onResult(result);
        }
        
        Alert.alert(
            severity === 'high' ? '⚠️ Assessment Result' : '📊 Assessment Result',
            `${message}\n\nScore: ${Math.round(score)}%`,
            [{ text: 'OK' }]
        );
        
        if (nextAction === 'healthy_exit') {
            navigation.navigate('HealthyExit', { score: Math.round(score) });
        } else if (nextAction === 'continue_to_app') {
            navigation.navigate('Register');
        }
    };

    const getProgress = () => {
        return (Object.keys(answers).length / NHANES_QUESTIONS.length) * 100;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📝 Asthma Questionnaire</Text>
                <Text style={styles.subtitle}>
                    Based on NHANES Respiratory Health Survey
                </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {Object.keys(answers).length} / {NHANES_QUESTIONS.length} answered
                </Text>
            </View>

            {NHANES_QUESTIONS.map((q, index) => (
                <View key={q.id} style={styles.questionCard}>
                    <Text style={styles.questionText}>
                        {index + 1}. {q.text}
                    </Text>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[
                                styles.optionBtn,
                                answers[q.id] === true && styles.optionSelected
                            ]}
                            onPress={() => toggleAnswer(q.id, true)}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={answers[q.id] === true ? "#10b981" : "#9ca3af"} />
                            <Text style={[styles.optionText, answers[q.id] === true && styles.optionTextSelected]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.optionBtn,
                                answers[q.id] === false && styles.optionSelected
                            ]}
                            onPress={() => toggleAnswer(q.id, false)}
                        >
                            <Ionicons name="close-circle" size={20} color={answers[q.id] === false ? "#ef4444" : "#9ca3af"} />
                            <Text style={[styles.optionText, answers[q.id] === false && styles.optionTextSelected]}>No</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Submit & Get Assessment</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        backgroundColor: '#547bfb',
        padding: 20,
        paddingTop: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        marginBottom: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: 6,
        backgroundColor: '#10b981',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'right',
    },
    questionCard: {
        backgroundColor: '#fff',
        margin: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    optionSelected: {
        borderColor: '#547bfb',
        backgroundColor: '#eff6ff',
    },
    optionText: {
        fontSize: 14,
        color: '#374151',
    },
    optionTextSelected: {
        color: '#547bfb',
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: '#547bfb',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default QuestionnaireScreen;