// screens/SeverityTestScreen.js - SIMPLIFIED VERSION (No Audio Recording)
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SeverityTestScreen({ navigation, route }) {
    const { audioProbability, questionnaireScore, finalScore } = route.params || {};
    
    // States
    const [step, setStep] = useState(1); // 1=Type Questions, 2=Severity Questions, 3=Results
    const [typeAnswers, setTypeAnswers] = useState({});
    const [severityAnswers, setSeverityAnswers] = useState({});
    
    // ============ ASTHMA TYPE QUESTIONS (GINA-Based) ============
    const typeQuestions = [
        {
            id: 'allergy_history',
            text: 'Do you have allergies to pollen, dust mites, pet dander, or mold?',
            category: 'allergic'
        },
        {
            id: 'family_history',
            text: 'Does anyone in your family (parents, siblings) have asthma or allergies?',
            category: 'allergic'
        },
        {
            id: 'eczema',
            text: 'Do you have or have you had eczema (atopic dermatitis)?',
            category: 'allergic'
        },
        {
            id: 'age_of_onset',
            text: 'When did your breathing symptoms first appear?',
            options: [
                { text: 'Childhood (before 12 years old)', category: 'allergic' },
                { text: 'Adulthood (12 years or older)', category: 'nonAllergic' }
            ]
        },
        {
            id: 'cold_air_trigger',
            text: 'Does cold air or exercise trigger your breathing problems?',
            category: 'nonAllergic'
        },
        {
            id: 'viral_trigger',
            text: 'Do colds or respiratory infections trigger your symptoms?',
            category: 'nonAllergic'
        },
        {
            id: 'stress_trigger',
            text: 'Does stress or anxiety make your breathing worse?',
            category: 'nonAllergic'
        }
    ];
    
    // ============ SEVERITY QUESTIONS (Based on GINA 2025) ============
    // Based on GINA assessment of asthma control (Box 2-2, p.37)
    const severityQuestions = [
        {
            id: 'daytime_symptoms',
            text: 'In the past 4 weeks, how often did you have daytime asthma symptoms?',
            options: [
                { text: 'Less than twice a week', points: 1, level: 'intermittent' },
                { text: 'More than twice a week but not daily', points: 2, level: 'mild' },
                { text: 'Daily', points: 3, level: 'moderate' },
                { text: 'Throughout the day', points: 4, level: 'severe' }
            ]
        },
        {
            id: 'night_symptoms',
            text: 'In the past 4 weeks, how often did you wake up at night due to asthma?',
            options: [
                { text: 'Never or less than twice a month', points: 1, level: 'intermittent' },
                { text: '1-2 times per week', points: 2, level: 'mild' },
                { text: '3-4 times per week', points: 3, level: 'moderate' },
                { text: 'Most nights', points: 4, level: 'severe' }
            ]
        },
        {
            id: 'reliever_use',
            text: 'How often do you use your reliever inhaler for symptom relief?',
            options: [
                { text: 'Less than twice a week', points: 1, level: 'intermittent' },
                { text: 'More than twice a week', points: 2, level: 'mild' },
                { text: 'Daily', points: 3, level: 'moderate' },
                { text: 'Several times daily', points: 4, level: 'severe' }
            ]
        },
        {
            id: 'activity_limitation',
            text: 'Does asthma limit your daily activities or exercise?',
            options: [
                { text: 'No limitation', points: 1, level: 'intermittent' },
                { text: 'Mild limitation', points: 2, level: 'mild' },
                { text: 'Moderate limitation', points: 3, level: 'moderate' },
                { text: 'Severe limitation', points: 4, level: 'severe' }
            ]
        },
        {
            id: 'exacerbations',
            text: 'How many asthma attacks (exacerbations) have you had in the past year?',
            options: [
                { text: 'None', points: 1, level: 'intermittent' },
                { text: '1', points: 2, level: 'mild' },
                { text: '2-3', points: 3, level: 'moderate' },
                { text: '4 or more', points: 4, level: 'severe' }
            ]
        }
    ];
    
    const handleTypeAnswer = (questionId, value) => {
        setTypeAnswers(prev => ({ ...prev, [questionId]: value }));
    };
    
    const handleSeverityAnswer = (questionId, points) => {
        setSeverityAnswers(prev => ({ ...prev, [questionId]: points }));
    };
    
    const isTypeComplete = () => {
        return typeQuestions.every(q => typeAnswers[q.id] !== undefined);
    };
    
    const isSeverityComplete = () => {
        return severityQuestions.every(q => severityAnswers[q.id] !== undefined);
    };
    
    // Calculate asthma type based on GINA allergic vs non-allergic classification
    const getAsthmaTypeResult = () => {
        let allergicCount = 0;
        let nonAllergicCount = 0;
        
        Object.entries(typeAnswers).forEach(([id, value]) => {
            if (value === 'allergic') allergicCount++;
            if (value === 'nonAllergic') nonAllergicCount++;
        });
        
        // Based on GINA 2025: Allergic asthma is associated with atopy, family history, childhood onset
        if (allergicCount > nonAllergicCount) {
            return {
                type: 'Allergic (Extrinsic) Asthma',
                description: 'This type of asthma is triggered by allergens and often starts in childhood. It is associated with a family history of allergies or asthma.',
                triggers: ['Pollen', 'Dust mites', 'Pet dander', 'Mold', 'Cockroaches'],
                recommendations: [
                    'Identify and avoid allergen triggers',
                    'Use air purifiers with HEPA filters',
                    'Keep windows closed during high pollen seasons',
                    'Wash bedding weekly in hot water',
                    'Consider allergy testing and immunotherapy'
                ],
                gina_reference: 'GINA 2025: Allergic asthma often commences in childhood and is associated with past and/or family history of allergic disease.'
            };
        } else {
            return {
                type: 'Non-Allergic (Intrinsic) Asthma',
                description: 'This type of asthma is triggered by irritants or physiological factors rather than allergies. It often starts in adulthood.',
                triggers: ['Cold air', 'Exercise', 'Stress/Anxiety', 'Smoke/Pollution', 'Viral infections'],
                recommendations: [
                    'Avoid smoke and air pollution',
                    'Wear scarf/mask in cold weather',
                    'Practice stress management techniques',
                    'Get flu and pneumonia vaccines',
                    'Warm up before exercise'
                ],
                gina_reference: 'GINA 2025: Non-allergic asthma is not associated with allergy. Adult-onset asthma tends to be non-allergic.'
            };
        }
    };
    
    // Calculate severity level based on GINA 2025 classification
    // Based on GINA Box 2-2: Symptom control and risk factors
    const getSeverityLevelResult = () => {
        let totalPoints = 0;
        severityQuestions.forEach(q => {
            if (severityAnswers[q.id]) {
                totalPoints += severityAnswers[q.id];
            }
        });
        
        const maxPoints = severityQuestions.length * 4; // 5 questions * 4 = 20
        const percentage = (totalPoints / maxPoints) * 100;
        
        // GINA 2025 severity classification based on treatment required (retrospective)
        // Intermittent: Symptoms ≤2 days/week, no night symptoms, no activity limitation
        // Mild Persistent: Symptoms >2 days/week but not daily
        // Moderate Persistent: Daily symptoms, night symptoms 3-4 times/week
        // Severe Persistent: Continuous symptoms, frequent night symptoms, extreme limitation
        if (percentage >= 75) {
            return {
                level: 'Severe Persistent Asthma',
                description: 'Continuous symptoms throughout the day. Frequent night symptoms (most nights). Extreme activity limitation. Multiple exacerbations per year.',
                color: '#7f1d1d',
                gina_step: 'Step 5',
                treatment: 'High-dose ICS-LABA + add-on therapy (biologics, LAMA, or low-dose OCS as last resort)',
                recommendation: 'Refer to specialist for assessment of add-on biologic therapy. Emergency consultation recommended if experiencing severe symptoms.'
            };
        } else if (percentage >= 50) {
            return {
                level: 'Moderate Persistent Asthma',
                description: 'Daily symptoms. Night symptoms 3-4 times per week. Some activity limitation. Exacerbations may affect daily activities.',
                color: '#ef4444',
                gina_step: 'Step 4',
                treatment: 'Medium-dose ICS-LABA plus as-needed reliever, or MART with ICS-formoterol',
                recommendation: 'Schedule appointment with healthcare provider within 2 weeks to review treatment and consider step-up therapy.'
            };
        } else if (percentage >= 25) {
            return {
                level: 'Mild Persistent Asthma',
                description: 'Symptoms more than twice a week but not daily. Night symptoms 1-2 times per week. Mild activity limitation.',
                color: '#f59e0b',
                gina_step: 'Step 2 or 3',
                treatment: 'Low-dose ICS plus as-needed SABA, or as-needed low-dose ICS-formoterol',
                recommendation: 'Follow up in 1 month. Monitor symptoms regularly. Consider daily controller medication.'
            };
        } else {
            return {
                level: 'Intermittent Asthma',
                description: 'Symptoms less than twice a week. No night symptoms. No activity limitation between episodes. Normal lung function between exacerbations.',
                color: '#10b981',
                gina_step: 'Step 1',
                treatment: 'As-needed low-dose ICS-formoterol, or low-dose ICS whenever SABA is taken',
                recommendation: 'Routine follow-up in 3 months. Continue as-needed reliever treatment. Monitor for symptom changes.'
            };
        }
    };
    
    const handleComplete = () => {
        const asthmaTypeResult = getAsthmaTypeResult();
        const severityResult = getSeverityLevelResult();
        
        // Navigate to results screen
        navigation.replace('SeverityResult', {
            asthmaType: asthmaTypeResult,
            severity: severityResult,
            audioProbability: audioProbability,
            questionnaireScore: questionnaireScore,
            finalScore: finalScore,
            age: route.params?.age,        // Pass through age
            // bmi: route.params?.bmi,        // Pass through BMI  
            sex: route.params?.sex         // Pass through sex
        });
    };
    
    // ============ RENDER STEP 1: ASTHMA TYPE QUESTIONS ============
    if (step === 1) {
        return (
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.header}>
                    <Ionicons name="medical-outline" size={60} color="#fff" />
                    <Text style={styles.headerTitle}>Determine Asthma Type</Text>
                    <Text style={styles.headerSubtitle}>Step 1 of 2</Text>
                </LinearGradient>
                
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: '50%' }]} />
                    <Text style={styles.progressText}>Step 1/2: Asthma Type</Text>
                </View>
                
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>📊 Initial Screening Results</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Audio Probability:</Text>
                        <Text style={styles.infoValue}>{Math.round((audioProbability || 0) * 100)}%</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Questionnaire Score:</Text>
                        <Text style={styles.infoValue}>{Math.round(questionnaireScore || 0)}%</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Combined Score:</Text>
                        <Text style={styles.infoValue}>{finalScore || 0}%</Text>
                    </View>
                    <View style={styles.divider} />
                    <Text style={styles.infoNote}>
                        Asthma detected! Let's determine your asthma type and severity.
                    </Text>
                </View>
                
                {typeQuestions.map((q, index) => (
                    <View key={q.id} style={styles.card}>
                        <Text style={styles.questionText}>{index + 1}. {q.text}</Text>
                        
                        {q.options ? (
                            <View style={styles.optionsContainer}>
                                {q.options.map(opt => (
                                    <TouchableOpacity
                                        key={opt.text}
                                        style={[
                                            styles.optionBtn,
                                            typeAnswers[q.id] === opt.category && styles.optionSelected
                                        ]}
                                        onPress={() => handleTypeAnswer(q.id, opt.category)}
                                    >
                                        <Text style={styles.optionText}>{opt.text}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.optionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionBtn,
                                        typeAnswers[q.id] === 'allergic' && styles.optionSelected
                                    ]}
                                    onPress={() => handleTypeAnswer(q.id, 'allergic')}
                                >
                                    <Ionicons name="leaf" size={20} color={typeAnswers[q.id] === 'allergic' ? "#10b981" : "#6b7280"} />
                                    <Text style={styles.optionText}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.optionBtn,
                                        typeAnswers[q.id] === 'nonAllergic' && styles.optionSelected
                                    ]}
                                    onPress={() => handleTypeAnswer(q.id, 'nonAllergic')}
                                >
                                    <Ionicons name="alert-circle" size={20} color={typeAnswers[q.id] === 'nonAllergic' ? "#ef4444" : "#6b7280"} />
                                    <Text style={styles.optionText}>No</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
                
                <TouchableOpacity
                    style={[styles.nextBtn, !isTypeComplete() && styles.disabledBtn]}
                    onPress={() => setStep(2)}
                    disabled={!isTypeComplete()}
                >
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.nextGradient}>
                        <Text style={styles.nextBtnText}>Next: Severity Assessment →</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        );
    }
    
    // ============ RENDER STEP 2: SEVERITY QUESTIONS ============
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.header}>
                <Ionicons name="speedometer-outline" size={60} color="#fff" />
                <Text style={styles.headerTitle}>Asthma Severity Assessment</Text>
                <Text style={styles.headerSubtitle}>Step 2 of 2</Text>
            </LinearGradient>
            
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '100%' }]} />
                <Text style={styles.progressText}>Step 2/2: Severity Level</Text>
            </View>
            
            {severityQuestions.map((q, index) => (
                <View key={q.id} style={styles.card}>
                    <Text style={styles.questionText}>{index + 1}. {q.text}</Text>
                    
                    {q.options.map(opt => (
                        <TouchableOpacity
                            key={opt.text}
                            style={[
                                styles.severityOption,
                                severityAnswers[q.id] === opt.points && styles.severityOptionSelected
                            ]}
                            onPress={() => handleSeverityAnswer(q.id, opt.points)}
                        >
                            <Text style={styles.severityOptionText}>{opt.text}</Text>
                            {severityAnswers[q.id] === opt.points && (
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
            
            <TouchableOpacity
                style={[styles.nextBtn, !isSeverityComplete() && styles.disabledBtn]}
                onPress={handleComplete}
                disabled={!isSeverityComplete()}
            >
                <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.nextGradient}>
                    <Text style={styles.nextBtnText}>Get Complete Assessment →</Text>
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    progressContainer: {
        margin: 16,
        marginBottom: 0,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#10b981',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'right',
    },
    infoCard: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 20,
        padding: 20,
        borderRadius: 20,
        elevation: 3,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
    },
    infoNote: {
        fontSize: 13,
        color: '#ef4444',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        marginBottom: 8,
        padding: 20,
        borderRadius: 16,
        elevation: 2,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
        lineHeight: 22,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    optionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
        backgroundColor: '#fff',
    },
    optionSelected: {
        borderColor: '#547bfb',
        backgroundColor: '#eff6ff',
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    severityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    severityOptionSelected: {
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4',
    },
    severityOptionText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    nextBtn: {
        margin: 16,
        marginTop: 8,
        marginBottom: 30,
        borderRadius: 12,
        overflow: 'hidden',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    nextGradient: {
        padding: 16,
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disclaimer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 30,
        padding: 12,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        gap: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 11,
        color: '#991b1b',
        lineHeight: 16,
    },
});