// components/AudioRecorder.js - WITH AUTO IP DETECTION
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, 
    ActivityIndicator, Alert, Animated
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import api, { analyzeAudio } from '../services/api'; 

const AudioRecorder = ({ onResult, buttonText = "Record Cough" }) => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [serverIp, setServerIp] = useState(null);
    const timerRef = useRef(null);
    const animation = useRef(new Animated.Value(0)).current;
    
    // Auto-detect server IP on component mount
    useEffect(() => {
        getServerIp();
    }, []);
    
    const getServerIp = async () => {
        try {
            // Get the device's local IP address
            const ipAddress = await Network.getIpAddressAsync();
            
            // Extract the network prefix (first 3 octets)
            // e.g., 192.168.100.15 -> 192.168.100
            const ipParts = ipAddress.split('.');
            const networkPrefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
            
            // Try common server IPs on your network
            // Your backend runs on port 5001, not 5000!
            const possibleIps = [
                `${networkPrefix}.15`,  // Your computer's IP
                `${networkPrefix}.1`,   // Router/Gateway
                `${networkPrefix}.100`,
                'localhost',
                '10.0.0.2'
            ];
            
            // Test which IP has the backend running
            for (const testIp of possibleIps) {
                try {
                    const testUrl = `http://${testIp}:5001/health`;
                    console.log(`Testing: ${testUrl}`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    
                    const response = await fetch(testUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        console.log(`✅ Found backend at: ${testIp}:5001`);
                        setServerIp(testIp);
                        return;
                    }
                } catch (e) {
                    // Continue trying
                }
            }
            
            // Fallback: ask user for IP
            Alert.alert(
                'Server Not Found',
                'Could not auto-detect backend server. Please enter your computer\'s IP address:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Enter IP', 
                        onPress: () => {
                            Alert.prompt('Enter Server IP', 'Example: 192.168.100.15', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'OK', onPress: (ip) => setServerIp(ip) }
                            ]);
                        }
                    }
                ]
            );
            
        } catch (error) {
            console.error('Failed to detect IP:', error);
            setServerIp('192.168.100.15'); // Fallback
        }
    };
    
    // Health check using auto-detected IP
    const checkBackendHealth = async () => {
        if (!serverIp) {
            console.log('Waiting for server IP detection...');
            return false;
        }
        
        try {
            // Use port 5001 (Python backend), not 5000 (Node.js backend)
            const healthUrl = `http://${serverIp}:5001/health`;
            console.log(`Checking health at: ${healthUrl}`);
            
            const response = await fetch(healthUrl);
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
                    `Cannot reach server at ${serverIp || 'auto-detected IP'}:5001\n\n` +
                    'Make sure:\n' +
                    '1. Phone and computer are on the same WiFi network\n' +
                    '2. Backend is running (python app.py)\n' +
                    '3. No firewall is blocking port 5001'
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
                        sampleRate: 22050,  // ✅ FIXED: Match training data
                        numberOfChannels: 1,
                        bitRate: 128000,
                    },
                    ios: {
                        extension: '.wav',
                        audioQuality: Audio.IOSAudioQuality.MAX,
                        sampleRate: 22050,  // ✅ FIXED: Match training data
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
            
            // Call the analyzeAudio function with the detected server IP
            const data = await analyzeAudio(base64, serverIp);

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
        
        // Updated severity mapping for new thresholds
        const prob = result.asthma_probability;
        if (prob > 0.65) return '#ef4444';      // High - Red
        if (prob > 0.31) return '#f59e0b';      // Uncertain - Orange
        return '#10b981';                        // Low - Green
    };

    const getSeverityText = () => {
        if (!result) return 'No result';
        
        const prob = result.asthma_probability;
        if (prob > 0.65) return `⚠️ High Risk (${Math.round(prob * 100)}%)`;
        if (prob > 0.31) return `🟡 Uncertain (${Math.round(prob * 100)}%)`;
        return `✅ Low Risk (${Math.round(prob * 100)}%)`;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎤 Asthma Screening</Text>
            <Text style={styles.subtitle}>
                Record your cough or breathing (5-10 seconds)
            </Text>
            
            {/* Show server status */}
            {serverIp && (
                <Text style={styles.serverStatus}>
                    📡 Connected to: {serverIp}:5001
                </Text>
            )}
            
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
                disabled={analyzing || !serverIp}
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
                    <Text style={[styles.resultTitle, { color: getSeverityColor() }]}>
                        {getSeverityText()}
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
    serverStatus: {
        fontSize: 11,
        color: '#10b981',
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: 'monospace',
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
    resultMessage: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 8,
        lineHeight: 18,
    },
});

export default AudioRecorder;