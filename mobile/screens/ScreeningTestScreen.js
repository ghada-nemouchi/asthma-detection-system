// screens/ScreeningTestScreen.js - COMPLETE with auto IP detection + test button
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Animated, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { initServerIp, getPythonBaseUrl } from '../services/api';

const { width } = Dimensions.get('window');

// Complete NHANES Questions
const NHANES_QUESTIONS = [
    {
        id: 'wheezing',
        text: 'Have you had wheezing or whistling in your chest in the past year?',
        weight: 3
    },
    {
        id: 'asthma_diagnosis',
        text: 'Has a doctor ever told you that you have asthma?',
        weight: 3
    },
    {
        id: 'night_symptoms',
        text: 'Do you wake up with chest tightness or coughing?',
        weight: 2
    },
    {
        id: 'exercise_trigger',
        text: 'Does exercise or cold air trigger breathing problems?',
        weight: 2
    },
    {
        id: 'family_history',
        text: 'Does a close relative have asthma?',
        weight: 2
    },
    {
        id: 'smoking',
        text: 'Do you currently smoke cigarettes?',
        weight: 1,
        reverse: true
    },
    {
        id: 'rescue_use',
        text: 'Have you used a rescue inhaler in the past 12 months?',
        weight: 2
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
    
    // Questionnaire states
    const [answers, setAnswers] = useState({});
    
    // UI states
    const [showDebug, setShowDebug] = useState(false); // For testing
    
    // Animation values
    const timerRef = useRef(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;
    
    // Initialize server connection on mount
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
            
            // Test connection
            const healthResponse = await fetch(`${baseUrl}/health`);
            if (healthResponse.ok) {
                setConnectionStatus('connected');
                console.log('✅ Connected to Python backend');
            } else {
                setConnectionStatus('error');
                Alert.alert('Connection Warning', 'Backend server found but health check failed.');
            }
        } catch (error) {
            console.error('Failed to initialize server:', error);
            setConnectionStatus('error');
            Alert.alert(
                'Connection Error',
                'Could not connect to the asthma detection server.\n\n' +
                'Make sure:\n' +
                '1. Your computer and phone are on the same WiFi\n' +
                '2. Python backend is running (python app.py)\n' +
                '3. Port 5001 is not blocked by firewall'
            );
        }
    };
    
    // Start breathing animation
    const startBreathingAnimation = () => {
        const breatheIn = () => {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                })
            ]).start(() => breatheOut());
        };
        
        const breatheOut = () => {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.4,
                    duration: 4000,
                    useNativeDriver: true,
                })
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
    
    // ============ AUDIO FUNCTIONS ============
    const startRecording = async () => {
        if (connectionStatus !== 'connected') {
            Alert.alert('Not Connected', 'Please wait for server connection or check your network.');
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
            
            // Use the detected server URL
            const url = `${serverBaseUrl}/predict-asthma-audio`;
            console.log('📡 Sending to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_base64: base64 })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const aiResult = await response.json();
            console.log('📊 Audio result:', aiResult);
            
            setAudioResult(aiResult);
            setHasRecorded(true);
            
            if (aiResult.error) {
                Alert.alert('Analysis Error', aiResult.message || 'Failed to analyze audio');
            } else {
                Alert.alert('Recording Complete', `Analysis complete! Probability: ${Math.round(aiResult.asthma_probability * 100)}%`);
            }
            
        } catch (error) {
            console.error('Analysis error:', error);
            Alert.alert('Error', 'Failed to analyze audio. Please try again.');
        } finally {
            setAnalyzing(false);
            setRecording(null);
        }
    };
    
    // ============ QUESTIONNAIRE FUNCTIONS ============
    const toggleAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };
    
    const calculateQuestionnaireScore = () => {
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
        
        if (totalWeight === 0) return 50;
        return (weightedScore / totalWeight) * 100;
    };
    
    const getProgress = () => {
        return (Object.keys(answers).length / NHANES_QUESTIONS.length) * 100;
    };
    
    // ============ FINAL CALCULATION ============
    const calculateFinalResult = () => {
        const questionnaireScore = calculateQuestionnaireScore();
        
        let finalScore = questionnaireScore;
        let source = 'questionnaire';
        let isAsthmatic = false;
        
        if (audioResult && audioResult.asthma_probability) {
            const audioValue = audioResult.asthma_probability * 100;
            finalScore = (audioValue * 0.6) + (questionnaireScore * 0.4);
            source = 'combined';
            // Threshold 0.32 for asthma detection
            isAsthmatic = audioResult.asthma_probability >= 0.32;
        }
        
        return { finalScore, source, isAsthmatic, audioProbability: audioResult?.asthma_probability };
    };
    
    const handleSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < NHANES_QUESTIONS.length) {
            Alert.alert('Incomplete', `Please answer all ${NHANES_QUESTIONS.length} questions`);
            return;
        }
        
        const { finalScore, source, isAsthmatic, audioProbability } = calculateFinalResult();
        
        if (isAsthmatic) {
            navigation.replace('SeverityTest', {
                audioProbability: audioProbability,
                questionnaireScore: calculateQuestionnaireScore(),
                finalScore: Math.round(finalScore)
            });
        } else {
            navigation.replace('HealthyExit', {
                score: Math.round(finalScore),
                source: source,
                severity: 'low',
                message: 'No asthmatic pattern detected. You appear healthy!'
            });
        }
    };
    
    // ============ TEST FUNCTION ============
    const testAudioResult = () => {
        if (!audioResult) {
            Alert.alert('No Audio', 'Please record audio first');
            return;
        }
        
        Alert.alert(
            '🔬 Audio Analysis Result',
            `Probability: ${Math.round(audioResult.asthma_probability * 100)}%\n` +
            `Classification: ${audioResult.asthma_probability >= 0.32 ? 'ASTHMA 🫁' : 'HEALTHY ✅'}\n` +
            `Confidence: ${Math.round((audioResult.confidence || 0.8) * 100)}%\n\n` +
            `Interpretation:\n` +
            `${audioResult.asthma_probability >= 0.32 ? 
                '⚠️ Asthmatic pattern detected. Will proceed to severity test.' : 
                '✅ No asthmatic pattern detected.'}`,
            [{ text: 'OK' }]
        );
    };
    
    // ============ RENDER ============
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.header}>
                <Image 
                    source={require('../assets/images/lungs.png')} 
                    style={styles.lungsIcon}
                    resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Respiratory Screening</Text>
                <Text style={styles.headerSubtitle}>AI-Powered Lung Health Assessment</Text>
                
                {/* Connection Status */}
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
            
            {/* Recording Section */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>🎤 Breathing Test</Text>
                <Text style={styles.cardSubtitle}>Record 5-10 seconds of breathing or coughing</Text>

                {!hasRecorded ? (
                    <>
                        <View style={styles.instructionRow}>
                            <Text style={styles.instructionIcon}>📱</Text>
                            <Text style={styles.instructionText}>Hold phone at 90° angle</Text>
                        </View>
                        <View style={styles.instructionRow}>
                            <Text style={styles.instructionIcon}>📏</Text>
                            <Text style={styles.instructionText}>Keep 10-20 cm from mouth</Text>
                        </View>

                        {isRecording ? (
                            <View style={styles.recordingSection}>
                                <View style={styles.animationContainer}>
                                    <Animated.View
                                        style={[
                                            styles.breathingCircle,
                                            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
                                        ]}
                                    >
                                        <Text style={styles.breathingText}>Breathe</Text>
                                    </Animated.View>
                                    <Animated.View
                                        style={[
                                            styles.breathingRing,
                                            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
                                        ]}
                                    />
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
                            <>
                                <TouchableOpacity 
                                    style={[styles.recordBtn, connectionStatus !== 'connected' && styles.disabledBtn]} 
                                    onPress={startRecording}
                                    disabled={connectionStatus !== 'connected'}
                                >
                                    <Ionicons name="mic" size={28} color="#fff" />
                                    <Text style={styles.recordBtnText}>
                                        {connectionStatus === 'connected' ? 'Start Test' : 'Waiting for Server...'}
                                    </Text>
                                </TouchableOpacity>
                                
                                {/* TEST BUTTON - Shows audio result (if available) */}
                                {audioResult && (
                                    <TouchableOpacity 
                                        style={styles.testBtn}
                                        onPress={testAudioResult}
                                    >
                                        <Ionicons name="flask-outline" size={20} color="#547bfb" />
                                        <Text style={styles.testBtnText}>View Audio Result</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <View style={styles.successSection}>
                        <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                        <Text style={styles.successText}>Recording Complete!</Text>
                        <Text style={styles.successSubtext}>
                            Probability: {Math.round((audioResult?.asthma_probability || 0) * 100)}%
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryBtn}
                            onPress={() => {
                                setHasRecorded(false);
                                setAudioResult(null);
                            }}
                        >
                            <Ionicons name="refresh" size={20} color="#547bfb" />
                            <Text style={styles.retryBtnText}>Record Again</Text>
                        </TouchableOpacity>
                        
                        {/* TEST BUTTON after recording */}
                        <TouchableOpacity 
                            style={[styles.testBtn, { marginTop: 8 }]}
                            onPress={testAudioResult}
                        >
                            <Ionicons name="flask-outline" size={20} color="#547bfb" />
                            <Text style={styles.testBtnText}>View Detailed Audio Result</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            
            {/* Questionnaire Section - visible after recording */}
            {hasRecorded && !analyzing && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📋 Health Questionnaire</Text>
                    <Text style={styles.cardSubtitle}>Based on NHANES Respiratory Survey</Text>
                    
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {Object.keys(answers).length} / {NHANES_QUESTIONS.length} answered
                    </Text>
                    
                    {NHANES_QUESTIONS.map((q, index) => (
                        <View key={q.id} style={styles.questionItem}>
                            <Text style={styles.questionText}>
                                {index + 1}. {q.text}
                            </Text>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={[styles.optionBtn, answers[q.id] === true && styles.optionSelected]}
                                    onPress={() => toggleAnswer(q.id, true)}
                                >
                                    <Ionicons name="checkmark-circle" size={20} color={answers[q.id] === true ? "#10b981" : "#9ca3af"} />
                                    <Text style={styles.optionText}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionBtn, answers[q.id] === false && styles.optionSelected]}
                                    onPress={() => toggleAnswer(q.id, false)}
                                >
                                    <Ionicons name="close-circle" size={20} color={answers[q.id] === false ? "#ef4444" : "#9ca3af"} />
                                    <Text style={styles.optionText}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                        <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGradient}>
                            <Text style={styles.submitBtnText}>Get Results →</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
            
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
    lungsIcon: {
        width: 70,
        height: 70,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusConnected: {
        backgroundColor: '#10b981',
    },
    statusError: {
        backgroundColor: '#ef4444',
    },
    statusDetecting: {
        backgroundColor: '#f59e0b',
    },
    statusText: {
        fontSize: 11,
        color: '#fff',
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 20,
        padding: 20,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    instructionIcon: {
        fontSize: 22,
        width: 36,
    },
    instructionText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    recordBtn: {
        backgroundColor: '#ef4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 50,
        gap: 12,
        marginTop: 16,
    },
    disabledBtn: {
        backgroundColor: '#9ca3af',
    },
    recordBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        marginTop: 12,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#547bfb',
        backgroundColor: '#fff',
        gap: 8,
    },
    testBtnText: {
        color: '#547bfb',
        fontSize: 14,
        fontWeight: '500',
    },
    recordingSection: {
        alignItems: 'center',
        marginTop: 16,
    },
    animationContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    breathingCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
    breathingRing: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#3b82f6',
        position: 'absolute',
    },
    breathingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    recordingTimer: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 16,
    },
    stopBtn: {
        backgroundColor: '#6b7280',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 40,
    },
    stopBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    analyzingSection: {
        alignItems: 'center',
        marginTop: 16,
        gap: 16,
    },
    analyzingText: {
        fontSize: 14,
        color: '#6b7280',
    },
    successSection: {
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    successText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10b981',
    },
    successSubtext: {
        fontSize: 13,
        color: '#6b7280',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        padding: 8,
    },
    retryBtnText: {
        color: '#547bfb',
        fontSize: 13,
        fontWeight: '500',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: 12,
    },
    progressFill: {
        height: 6,
        backgroundColor: '#10b981',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#6b7280',
        textAlign: 'right',
        marginBottom: 16,
    },
    questionItem: {
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    questionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
        lineHeight: 20,
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
        backgroundColor: '#fff',
    },
    optionSelected: {
        borderColor: '#547bfb',
        backgroundColor: '#eff6ff',
    },
    optionText: {
        fontSize: 14,
        color: '#374151',
    },
    submitBtn: {
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitGradient: {
        padding: 16,
        alignItems: 'center',
    },
    submitBtnText: {
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