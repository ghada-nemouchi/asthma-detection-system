// components/AudioRecorder.js - FINAL WORKING VERSION
import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert, Animated
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import api, { analyzeAudio } from '../services/api'; 

const AudioRecorder = ({ onResult, buttonText = "Record Cough" }) => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);
    const animation = useRef(new Animated.Value(0)).current;
    
    // health check function
    const checkBackendHealth = async () => {
        try {
            const response = await fetch('http://192.168.100.15:5000/health');
            return response.ok;
        } catch (error) {
            console.error('Backend health check failed:', error);
            return false;
        }
    };

    const startRecording = async () => {
        try {
            // Check backend health before recording
            const isBackendReachable = await checkBackendHealth();
            if (!isBackendReachable) {
                Alert.alert(
                    'Connection Error', 
                    'Cannot reach server. Make sure your phone and computer are on the same WiFi network.\n\n' +
                    'Computer IP: 192.168.100.15:5000'
                );
                return;
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission needed', 'Microphone access is required');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    android: {
                    extension: '.wav',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.IOSAudioQuality.MAX,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
            }
            );
            setRecording(newRecording);
            setIsRecording(true);
            
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 10) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
            
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animation, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(animation, { toValue: 0, duration: 500, useNativeDriver: true })
                ])
            ).start();
            
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
        
        animation.stopAnimation();
        setIsRecording(false);
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        setAnalyzing(true);
        try {
            // Read audio file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            //  USE the analyzeAudio function with retry logic
            const data = await analyzeAudio(base64);

            console.log('Audio analysis result:', data);
            setResult(data);
            
            if (onResult) {
                onResult(data);
            }
            
            // Show alert if there was an error
            if (data.error) {
                Alert.alert('Analysis Error', data.message || 'Failed to analyze audio');
            }

                        
        } catch (error) {
            console.error('Analysis error:', error);
            Alert.alert('Error', 'Failed to analyze audio. Please try again.');
        } finally {
            setAnalyzing(false);
            setRecording(null);
        }
    };

    const getSeverityColor = () => {
        if (!result) return '#9ca3af';
        switch(result.severity) {
            case 'high': return '#ef4444';
            case 'moderate': return '#f59e0b';
            case 'mild': return '#eab308';
            default: return '#10b981';
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎤 Asthma Screening</Text>
            <Text style={styles.subtitle}>
                Record your cough or breathing (5-10 seconds)
            </Text>
            
            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <Animated.View style={[
                        styles.recordingDot,
                        { opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }
                    ]} />
                    <Text style={styles.recordingText}>
                        Recording... {recordingTime}s / 10s
                    </Text>
                </View>
            )}
            
            <TouchableOpacity 
                style={[
                    styles.button,
                    isRecording ? styles.stopButton : styles.recordButton,
                    analyzing && styles.disabledButton
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={analyzing}
            >
                {analyzing ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : isRecording ? (
                    <>
                        <Ionicons name="stop" size={24} color="#fff" />
                        <Text style={styles.buttonText}>Stop Recording</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="mic" size={24} color="#fff" />
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </>
                )}
            </TouchableOpacity>
            
            {result && !analyzing && !onResult && (
                <View style={[styles.resultCard, { borderLeftColor: getSeverityColor() }]}>
                    <Text style={styles.resultTitle}>
                        {result.severity === 'high' ? '⚠️ High Probability' :
                         result.severity === 'moderate' ? '🔶 Moderate Probability' :
                         result.severity === 'mild' ? '🟡 Mild Suspicion' :
                         '✅ Low Probability'}
                    </Text>
                    <Text style={styles.resultText}>
                        Probability: {Math.round(result.asthma_probability * 100)}%
                    </Text>
                    <Text style={styles.resultMessage}>{result.message}</Text>
                    
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f4ff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16,
    },
    button: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    recordButton: {
        backgroundColor: '#ef4444',
    },
    stopButton: {
        backgroundColor: '#6b7280',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
    },
    recordingText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    resultCard: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderLeftWidth: 4,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    resultText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
    resultMessage: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
    },
    resultNote: {
        fontSize: 10,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
});

export default AudioRecorder;
