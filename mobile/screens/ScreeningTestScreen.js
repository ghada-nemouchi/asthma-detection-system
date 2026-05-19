// screens/ScreeningTestScreen.js - Multi-step wizard with original blue design
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Animated, Dimensions, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { initServerIp, getPythonBaseUrl } from '../services/api';

const { width } = Dimensions.get('window');

// ============================================================================
// QUESTIONNAIRE SECTIONS - One section per screen
// ============================================================================
const QUESTIONNAIRE_SECTIONS = [
    {
        id: 'demographics',
        title: 'Quick Demographics',
        icon: '🏢',
        questions: [
            { id: 'age', text: 'What is your age?', type: 'number', placeholder: 'Enter age in years' },
            { id: 'sex', text: 'Sex assigned at birth?', type: 'select', options: ['Male', 'Female'] },
            { id: 'bmi', text: 'Height & Weight (BMI)', type: 'bmi', placeholder: 'Will be calculated' }
        ]
    },
    {
        id: 'symptoms',
        title: 'Core Symptoms',
        icon: '🫁',
        questions: [
            { id: 'wheezing', text: 'Have you experienced wheezing or whistling in your chest?', type: 'boolean' },
            { 
                id: 'wheezing_severity', 
                text: 'Which best describes your wheezing?', 
                type: 'select',
                options: ['Mild - No missed days', 'Limited - Limited daily activities', 'Severe - Woke me from sleep'],
                dependsOn: 'wheezing'
            },
            { id: 'night_cough', text: 'Have you had a dry cough at night without having a cold?', type: 'boolean' }
        ]
    },
    {
        id: 'history',
        title: 'Medical History',
        icon: '🏥',
        questions: [
            { id: 'inhaler_use', text: 'Have you used a prescription breathing inhaler in the past year?', type: 'boolean' },
            { id: 'eczema_allergy', text: 'I have a history of eczema or skin allergies', type: 'boolean' },
            { id: 'family_history', text: 'My parents, siblings, or children have asthma', type: 'boolean' },
            { id: 'has_copd', text: 'I have been diagnosed with COPD or Emphysema', type: 'boolean' },
            { id: 'smoking', text: 'I have smoked at least 100 cigarettes in my life', type: 'boolean' }
        ]
    }
];

export default function ScreeningTestScreen({ navigation }) {
    // Audio states
    const [hasRecorded, setHasRecorded] = useState(false);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [analyzing, setAnalyzing] = useState(false);
    const [audioResult, setAudioResult] = useState(null);
    const [serverBaseUrl, setServerBaseUrl] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('detecting...');
    const [recordedAudioBase64, setRecordedAudioBase64] = useState(null);

    // Questionnaire states
    const [answers, setAnswers] = useState({
        age: '',
        sex: null,
        height: '',
        weight: '',
        bmi: null,
        wheezing: null,
        wheezing_severity: null,
        night_cough: null,
        inhaler_use: null,
        eczema_allergy: null,
        family_history: null,
        has_copd: null,
        smoking: null
    });
    
    const [submitting, setSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0 = audio, 1-3 = sections
    
    // Animation values
    const timerRef = useRef(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;
    
    // Initialize server
    useEffect(() => {
        initializeServer();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);
    
    const initializeServer = async () => {
        try {
            setConnectionStatus('detecting...');
            const ip = await initServerIp();
            const baseUrl = getPythonBaseUrl();
            setServerBaseUrl(baseUrl);
            console.log('✅ Python backend URL:', baseUrl);
            
            const healthResponse = await fetch(`${baseUrl}/health`);
            if (healthResponse.ok) {
                setConnectionStatus('connected');
                console.log('✅ Connected to Python backend');
            } else {
                setConnectionStatus('error');
            }
        } catch (error) {
            console.error('Failed to initialize server:', error);
            setConnectionStatus('error');
            Alert.alert(
                'Connection Error',
                'Could not connect to the asthma detection server.\n\nMake sure:\n1. Computer and phone on same WiFi\n2. Python backend is running\n3. Port 5001 is not blocked'
            );
        }
    };
    
    // BMI Calculation
    const calculateBMI = () => {
        const heightM = parseFloat(answers.height) / 100;
        const weightKg = parseFloat(answers.weight);
        if (heightM && weightKg && heightM > 0) {
            const bmi = weightKg / (heightM * heightM);
            setAnswers(prev => ({ ...prev, bmi: bmi.toFixed(1) }));
            return bmi.toFixed(1);
        }
        return null;
    };
    
    // Answer handlers
    const updateAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        
        if (questionId === 'wheezing' && value === false) {
            setAnswers(prev => ({ ...prev, wheezing_severity: null }));
        }
        
        if (questionId === 'height' || questionId === 'weight') {
            setTimeout(() => calculateBMI(), 10);
        }
    };
    
    const isQuestionVisible = (question) => {
        if (question.dependsOn) {
            return answers[question.dependsOn] === true;
        }
        return true;
    };
    
    const isCurrentSectionComplete = () => {
        if (currentStep === 0) return hasRecorded;
        
        const section = QUESTIONNAIRE_SECTIONS[currentStep - 1];
        for (const q of section.questions) {
            if (!isQuestionVisible(q)) continue;
            const answer = answers[q.id];
            if (answer === null || answer === undefined || answer === '') {
                if (q.type === 'number' && answer !== 0) return false;
                if (q.type !== 'number') return false;
            }
        }
        return true;
    };
    
    const getTotalProgress = () => {
        let total = 1; // audio section
        let completed = hasRecorded ? 1 : 0;
        
        for (const section of QUESTIONNAIRE_SECTIONS) {
            total++;
            let sectionComplete = true;
            for (const q of section.questions) {
                if (!isQuestionVisible(q)) continue;
                const answer = answers[q.id];
                if (answer === null || answer === undefined || answer === '') {
                    if (q.type === 'number' && answer !== 0) sectionComplete = false;
                    else if (q.type !== 'number') sectionComplete = false;
                }
            }
            if (sectionComplete) completed++;
        }
        return (completed / total) * 100;
    };
    
    const goToNextStep = () => {
        if (!isCurrentSectionComplete()) {
            Alert.alert('Incomplete', 'Please complete all questions in this section before continuing.');
            return;
        }
        
        if (currentStep < QUESTIONNAIRE_SECTIONS.length) {
            setCurrentStep(currentStep + 1);
        }
    };
    
    const goToPreviousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    // ============ AUDIO FUNCTIONS ============
    const startRecording = async () => {
        if (connectionStatus !== 'connected') {
            Alert.alert('Not Connected', 'Please wait for server connection.');
            return;
        }
        
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Needed', 'Microphone access is required');
                return;
            }
            
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            
            setRecording(newRecording);
            setIsRecording(true);
            setRecordingTime(0);
            startBreathingAnimation();
            
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 9) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
            
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Could not start recording: ' + err.message);
        }
    };
    
    const stopRecording = async () => {
        if (!recording) return;
        
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        
        stopBreathingAnimation();
        setIsRecording(false);
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        setAnalyzing(true);
        
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            setRecordedAudioBase64(base64);

            const url = `${serverBaseUrl}/predict-asthma-audio`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_base64: base64 })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const aiResult = await response.json();
            console.log('📊 Audio result:', aiResult);
            
            setAudioResult(aiResult);
            setHasRecorded(true);
            
            Alert.alert('Analysis Complete', 
                `Probability: ${Math.round(aiResult.asthma_probability * 100)}%\n${aiResult.message || ''}`);
            
        } catch (error) {
            console.error('Analysis error:', error);
            Alert.alert('Error', 'Failed to analyze audio. Please try again.');
        } finally {
            setAnalyzing(false);
            setRecording(null);
        }
    };
    
    const startBreathingAnimation = () => {
        const breatheIn = () => {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 1.3, duration: 4000, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
            ]).start(() => breatheOut());
        };
        
        const breatheOut = () => {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 0.8, duration: 4000, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0.4, duration: 4000, useNativeDriver: true })
            ]).start(() => breatheIn());
        };
        
        breatheIn();
    };
    
    const stopBreathingAnimation = () => {
        scaleAnim.stopAnimation();
        opacityAnim.stopAnimation();
        Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0.6, duration: 300, useNativeDriver: true })
        ]).start();
    };
    
    // ============ SUBMIT TO COMBINED ENDPOINT ============
    const handleSubmit = async () => {
        setSubmitting(true);
        
        try {
            const questionnaireData = {
                age: parseInt(answers.age) || 40,
                sex: answers.sex?.toLowerCase(),
                bmi: parseFloat(answers.bmi) || 25,
                wheezing: answers.wheezing === true,
                wheezing_severity: answers.wheezing_severity?.toLowerCase() || 'none',
                night_cough: answers.night_cough === true,
                inhaler_use: answers.inhaler_use === true,
                eczema_allergy: answers.eczema_allergy === true,
                family_history: answers.family_history === true,
                has_copd: answers.has_copd === true,
                smoking: answers.smoking === true
            };
            
            let audioBase64 = null;
            if (hasRecorded && recordedAudioBase64) {
                audioBase64 = recordedAudioBase64;
            }

            const url = `${serverBaseUrl}/predict-combined`;
            const payload = { questionnaire: questionnaireData };
            
            if (audioBase64) {
                payload.audio_base64 = audioBase64;
            }
                        
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            console.log('🎯 Combined result:', result);
            
            if (result.is_asthmatic) {
                navigation.replace('SeverityTest', {
                    finalScore: Math.round(result.final_score * 100),
                    audioProbability: result.components.audio_probability,
                    clinicalProbability: result.components.clinical_probability,
                    recommendation: result.recommendation,
                    isAshmatic: true,
                    age: questionnaireData.age,
                    sex: questionnaireData.sex,
                    // bmi: questionnaireData.bmi
                });
            } else {
                navigation.replace('HealthyExit', {
                    score: Math.round(result.final_score * 100),
                    severity: result.final_risk_level,
                    message: result.recommendation,
                    source: result.fusion_method,
                    isAshmatic: false
                });
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            Alert.alert('Error', 'Failed to process assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    // Render question based on type
    const renderQuestion = (question) => {
        if (!isQuestionVisible(question)) return null;
        
        switch (question.type) {
            case 'number':
                return (
                    <TextInput
                        style={styles.input}
                        placeholder={question.placeholder}
                        keyboardType="numeric"
                        value={answers[question.id]?.toString() || ''}
                        onChangeText={(text) => updateAnswer(question.id, text)}
                    />
                );
                
            case 'select':
                return (
                    <View style={styles.optionsGroup}>
                        {question.options.map((opt, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.optionCard,
                                    answers[question.id] === (question.options.length === 2 ? 
                                        (idx === 0 ? 'Male' : 'Female') : 
                                        opt.split(' - ')[0]) && styles.optionCardSelected
                                ]}
                                onPress={() => {
                                    const value = question.options.length === 2 ? 
                                        (idx === 0 ? 'Male' : 'Female') : 
                                        opt.split(' - ')[0];
                                    updateAnswer(question.id, value);
                                }}
                            >
                                <Text style={styles.optionCardText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
                
            case 'boolean':
                return (
                    <View style={styles.booleanGroup}>
                        <TouchableOpacity
                            style={[styles.boolBtn, answers[question.id] === true && styles.boolBtnYes]}
                            onPress={() => updateAnswer(question.id, true)}
                        >
                            <Ionicons name="checkmark-circle" size={24} color={answers[question.id] === true ? "#10b981" : "#9ca3af"} />
                            <Text style={[styles.boolBtnText, answers[question.id] === true && { color: '#10b981' }]}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.boolBtn, answers[question.id] === false && styles.boolBtnNo]}
                            onPress={() => updateAnswer(question.id, false)}
                        >
                            <Ionicons name="close-circle" size={24} color={answers[question.id] === false ? "#ef4444" : "#9ca3af"} />
                            <Text style={[styles.boolBtnText, answers[question.id] === false && { color: '#ef4444' }]}>No</Text>
                        </TouchableOpacity>
                    </View>
                );
                
            case 'bmi':
                return (
                    <View style={styles.bmiContainer}>
                        <View style={styles.bmiRow}>
                            <View style={styles.bmiInput}>
                                <Text style={styles.bmiLabel}>Height (cm)</Text>
                                <TextInput
                                    style={styles.inputSmall}
                                    placeholder="e.g., 170"
                                    keyboardType="numeric"
                                    value={answers.height?.toString() || ''}
                                    onChangeText={(text) => updateAnswer('height', text)}
                                />
                            </View>
                            <View style={styles.bmiInput}>
                                <Text style={styles.bmiLabel}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.inputSmall}
                                    placeholder="e.g., 70"
                                    keyboardType="numeric"
                                    value={answers.weight?.toString() || ''}
                                    onChangeText={(text) => updateAnswer('weight', text)}
                                />
                            </View>
                        </View>
                        {answers.bmi && (
                            <View style={styles.bmiResult}>
                                <Text style={styles.bmiResultText}>BMI: {answers.bmi}</Text>
                            </View>
                        )}
                    </View>
                );
                
            default:
                return null;
        }
    };
    
    // Render current screen content
    const renderContent = () => {
        if (currentStep === 0) {
            // Audio Recording Screen
            return (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🎤 Breathing Test</Text>
                    <Text style={styles.cardSubtitle}>Record 5-10 seconds of breathing</Text>

                    {!hasRecorded ? (
                        <>
                            <View style={styles.instructionRow}>
                                <Text style={styles.instructionIcon}>📱</Text>
                                <Text style={styles.instructionText}>Hold phone at 90° angle, 10-20 cm from mouth</Text>
                            </View>

                            {isRecording ? (
                                <View style={styles.recordingSection}>
                                    <View style={styles.animationContainer}>
                                        <Animated.View style={[styles.breathingCircle, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
                                            <Text style={styles.breathingText}>Breathe</Text>
                                        </Animated.View>
                                        <Animated.View style={[styles.breathingRing, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />
                                    </View>
                                    <Text style={styles.recordingTimer}>{recordingTime}s / 10s</Text>
                                    <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                                        <Text style={styles.stopBtnText}>Stop Recording</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : analyzing ? (
                                <View style={styles.analyzingSection}>
                                    <ActivityIndicator size="large" color="#547bfb" />
                                    <Text style={styles.analyzingText}>AI analyzing your breathing...</Text>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.recordBtn, connectionStatus !== 'connected' && styles.disabledBtn]} 
                                    onPress={startRecording}
                                    disabled={connectionStatus !== 'connected'}
                                >
                                    <Ionicons name="mic" size={28} color="#fff" />
                                    <Text style={styles.recordBtnText}>
                                        {connectionStatus === 'connected' ? 'Start Breathing Test' : 'Waiting for Server...'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={styles.successSection}>
                            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                            <Text style={styles.successText}>Recording Complete!</Text>
                            <Text style={styles.successSubtext}>
                                Probability: {Math.round((audioResult?.asthma_probability || 0) * 100)}%
                            </Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={() => { setHasRecorded(false); setAudioResult(null); }}>
                                <Ionicons name="refresh" size={20} color="#547bfb" />
                                <Text style={styles.retryBtnText}>Record Again</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            );
        } else {
            // Questionnaire Section Screen
            const section = QUESTIONNAIRE_SECTIONS[currentStep - 1];
            return (
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionIcon}>{section.icon}</Text>
                        <Text style={styles.cardTitle}>{section.title}</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>Please answer all questions accurately</Text>
                    
                    {section.questions.map((question) => (
                        isQuestionVisible(question) && (
                            <View key={question.id} style={styles.questionItem}>
                                <Text style={styles.questionText}>{question.text}</Text>
                                {renderQuestion(question)}
                            </View>
                        )
                    ))}
                </View>
            );
        }
    };
    
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header - Original Blue */}
            <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.header}>
                <Image source={require('../assets/images/lungs.png')} style={styles.lungsIcon} resizeMode="contain" />
                <Text style={styles.headerTitle}>AsthmICare Screening</Text>
                <Text style={styles.headerSubtitle}>AI-Powered Lung Health Assessment</Text>
                
                <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, 
                        connectionStatus === 'connected' ? styles.statusConnected :
                        connectionStatus === 'error' ? styles.statusError : styles.statusDetecting
                    ]} />
                    <Text style={styles.statusText}>
                        {connectionStatus === 'connected' ? 'Server Connected' :
                         connectionStatus === 'error' ? 'Connection Error' : 'Detecting Server...'}
                    </Text>
                </View>
            </LinearGradient>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${getTotalProgress()}%` }]} />
                </View>
                <Text style={styles.progressText}>Step {currentStep + 1} of {QUESTIONNAIRE_SECTIONS.length + 1}</Text>
            </View>
            
            {/* Current Content */}
            {renderContent()}
            
            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
                {currentStep > 0 && (
                    <TouchableOpacity style={styles.backBtn} onPress={goToPreviousStep}>
                        <Ionicons name="arrow-back" size={20} color="#547bfb" />
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                )}
                
                {currentStep < QUESTIONNAIRE_SECTIONS.length ? (
                    <TouchableOpacity 
                        style={[styles.nextBtn, !isCurrentSectionComplete() && styles.disabledBtn]} 
                        onPress={goToNextStep}
                        disabled={!isCurrentSectionComplete()}
                    >
                        <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.nextGradient}>
                            <Text style={styles.nextBtnText}>Next</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.submitBtn, submitting && styles.disabledBtn]} 
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGradient}>
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.submitBtnText}>Get Results</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
            
            {/* Disclaimer */}
            <View style={styles.disclaimer}>
                <Ionicons name="warning-outline" size={16} color="#9ca3af" />
                <Text style={styles.disclaimerText}>
                    AI-powered screening only. Not a substitute for professional medical advice.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    
    // Header - Original Blue
    header: { paddingTop: 60, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    lungsIcon: { width: 70, height: 70, marginBottom: 12 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    statusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusConnected: { backgroundColor: '#10b981' },
    statusError: { backgroundColor: '#ef4444' },
    statusDetecting: { backgroundColor: '#f59e0b' },
    statusText: { fontSize: 11, color: '#fff' },
    
    // Progress
    progressContainer: { marginHorizontal: 16, marginTop: 16 },
    progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, backgroundColor: '#10b981', borderRadius: 3 },
    progressText: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 },
    
    // Card - Original Style
    card: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
    
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    sectionIcon: { fontSize: 24, marginRight: 8 },
    
    // Audio Recording
    instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    instructionIcon: { fontSize: 22, width: 36 },
    instructionText: { fontSize: 14, color: '#374151', flex: 1 },
    recordBtn: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 50, gap: 12, marginTop: 16 },
    disabledBtn: { opacity: 0.6 },
    recordBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    recordingSection: { alignItems: 'center', marginTop: 16 },
    animationContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    breathingCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', position: 'absolute' },
    breathingRing: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: '#3b82f6', position: 'absolute' },
    breathingText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    recordingTimer: { fontSize: 32, fontWeight: 'bold', color: '#ef4444', marginBottom: 16 },
    stopBtn: { backgroundColor: '#6b7280', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 40 },
    stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    analyzingSection: { alignItems: 'center', marginTop: 16, gap: 16 },
    analyzingText: { fontSize: 14, color: '#6b7280' },
    successSection: { alignItems: 'center', marginTop: 8, gap: 8 },
    successText: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
    successSubtext: { fontSize: 13, color: '#6b7280' },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8 },
    retryBtnText: { color: '#547bfb', fontSize: 13, fontWeight: '500' },
    
    // Questions
    questionItem: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    questionText: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 12, lineHeight: 20 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#f9fafb' },
    inputSmall: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: '#f9fafb', flex: 1 },
    optionsGroup: { gap: 10 },
    optionCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
    optionCardSelected: { borderColor: '#547bfb', backgroundColor: '#eff6ff' },
    optionCardText: { fontSize: 14, color: '#374151' },
    booleanGroup: { flexDirection: 'row', gap: 16 },
    boolBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 40, borderWidth: 1, borderColor: '#e5e7eb', gap: 8, backgroundColor: '#fff', flex: 1, justifyContent: 'center' },
    boolBtnYes: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
    boolBtnNo: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
    boolBtnText: { fontSize: 14, color: '#374151' },
    bmiContainer: { gap: 12 },
    bmiRow: { flexDirection: 'row', gap: 12 },
    bmiInput: { flex: 1 },
    bmiLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    bmiResult: { backgroundColor: '#f3f4f6', borderRadius: 10, padding: 10, alignItems: 'center' },
    bmiResultText: { fontSize: 16, fontWeight: 'bold', color: '#547bfb' },
    
    // Navigation Buttons
    navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, gap: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 40, borderWidth: 1, borderColor: '#547bfb', justifyContent: 'center', flex: 1 },
    backBtnText: { color: '#547bfb', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    nextBtn: { flex: 2, borderRadius: 40, overflow: 'hidden' },
    nextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    submitBtn: { flex: 2, borderRadius: 40, overflow: 'hidden' },
    submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    
    // Disclaimer
    disclaimer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 30, marginTop: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 12, gap: 8 },
    disclaimerText: { flex: 1, fontSize: 11, color: '#991b1b', lineHeight: 16 }
});