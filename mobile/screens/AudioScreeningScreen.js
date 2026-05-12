// screens/AudioScreeningScreen.js - ASYNCSTORAGE VERSION
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AudioRecorder from '../components/AudioRecorder';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@pending_audio_result';

const AudioScreeningScreen = ({ navigation, route }) => {
    const [lastResult, setLastResult] = useState(null);
    
    // Check for pending audio result on mount
    useEffect(() => {
        checkPendingAudioResult();
    }, []);
    
    // Listen for questionnaire result
    useEffect(() => {
        if (route.params?.questionnaireResult) {
            console.log('📋 Received questionnaire result:', route.params.questionnaireResult);
            handleCombinedResult(route.params.questionnaireResult);
        }
    }, [route.params?.questionnaireResult]);
    
    const checkPendingAudioResult = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const audioResult = JSON.parse(stored);
                console.log('📦 Retrieved pending audio result:', audioResult);
                setLastResult(audioResult);
                await AsyncStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Error checking pending audio:', error);
        }
    };

    const handleAudioResult = async (result) => {
        console.log('📊 Audio result:', result);
        setLastResult(result);
        
        if (result.next_action === 'healthy_exit') {
            navigation.replace('HealthyExit', { 
                score: result.asthma_probability * 100,
                source: 'audio'
            });
            
        } else if (result.next_action === 'questionnaire') {
            // Store audio result in AsyncStorage before navigating
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
                console.log('💾 Saved audio result to storage');
            } catch (error) {
                console.error('Error saving audio result:', error);
            }
            
            Alert.alert(
                '📋 Additional Assessment Needed',
                `${result.message}\n\nProbability: ${Math.round(result.asthma_probability * 100)}%\n\nWould you like to complete the questionnaire for a more accurate result?`,
                [
                    { 
                        text: 'Skip', 
                        style: 'cancel',
                        onPress: () => navigation.replace('HealthyExit', { 
                            score: result.asthma_probability * 100,
                            source: 'audio'
                        })
                    },
                    { 
                        text: 'Take Questionnaire', 
                        onPress: () => {
                            console.log('📝 Navigating to Questionnaire with audioProb:', result.asthma_probability);
                            navigation.navigate('Questionnaire', { 
                                audioProbability: result.asthma_probability
                            });
                        }
                    }
                ]
            );
            
        } else if (result.next_action === 'continue_to_app') {
            Alert.alert(
                '⚠️ High Risk Detected',
                `${result.message}\n\nProbability: ${Math.round(result.asthma_probability * 100)}%\n\nWould you like to create an account for professional monitoring?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Register', onPress: () => navigation.navigate('Register') }
                ]
            );
        }
    };

    const handleCombinedResult = async (questionnaireResult) => {
        // Try to get audio result from storage first
        let audioProb = 0;
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const audioResult = JSON.parse(stored);
                audioProb = audioResult.asthma_probability;
                console.log('📦 Retrieved audio prob from storage:', audioProb);
                await AsyncStorage.removeItem(STORAGE_KEY);
            } else {
                audioProb = lastResult?.asthma_probability || 0;
            }
        } catch (error) {
            console.error('Error retrieving audio result:', error);
            audioProb = lastResult?.asthma_probability || 0;
        }
        
        console.log('🎯 Combining results - Audio Prob:', audioProb);
        console.log('📊 Questionnaire score:', questionnaireResult.questionnaire_score);
        
        if (!questionnaireResult || questionnaireResult.questionnaire_score === undefined) {
            console.error('Invalid questionnaire result');
            navigation.replace('HealthyExit', { 
                score: audioProb * 100,
                source: 'audio'
            });
            return;
        }
        
        const questScore = questionnaireResult.questionnaire_score / 100;
        
        // Weighted average (60% audio, 40% questionnaire)
        const combinedProb = (audioProb * 0.6) + (questScore * 0.4);
        
        console.log(`✅ Combined calculation: Audio=${audioProb}, Quest=${questScore}, Combined=${combinedProb}`);
        console.log(`✅ Final score: ${Math.round(combinedProb * 100)}%`);
        
        // Clear params
        navigation.setParams({ questionnaireResult: null });
        
        navigation.replace('HealthyExit', { 
            score: Math.round(combinedProb * 100),
            source: 'combined'
        });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🎤 Asthma Screening</Text>
                <Text style={styles.subtitle}>
                    Record a cough or breathing sound for analysis
                </Text>
            </View>

            <AudioRecorder 
                onResult={handleAudioResult}
                buttonText="Start Recording"
            />

            <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
            </View>

            <TouchableOpacity 
                style={styles.questionnaireBtn}
                onPress={() => navigation.navigate('Questionnaire')}
            >
                <Ionicons name="document-text" size={24} color="#547bfb" />
                <Text style={styles.questionnaireBtnText}>Take Questionnaire Instead</Text>
            </TouchableOpacity>

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>📖 How it works</Text>
                <Text style={styles.infoText}>
                    1. Find a quiet place{'\n'}
                    2. Take a deep breath and cough naturally{'\n'}
                    3. Record for 5-10 seconds{'\n'}
                    4. AI analyzes your breathing pattern{'\n'}
                    5. Get instant results
                </Text>
            </View>

            <View style={styles.disclaimerCard}>
                <Text style={styles.disclaimerTitle}>⚠️ Important Note</Text>
                <Text style={styles.disclaimerText}>
                    This tool uses a machine learning model with 70% accuracy trained on the ICBHI Respiratory Sound Database. It is a screening tool only and not a substitute for professional medical diagnosis.
                </Text>
            </View>
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
        padding: 24,
        paddingTop: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        marginHorizontal: 16,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#9ca3af',
        fontSize: 12,
    },
    questionnaireBtn: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    questionnaireBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#547bfb',
    },
    infoCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 22,
    },
    disclaimerCard: {
        backgroundColor: '#fef2f2',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#dc2626',
        marginBottom: 8,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#991b1b',
        lineHeight: 18,
    },
});

export default AudioScreeningScreen;