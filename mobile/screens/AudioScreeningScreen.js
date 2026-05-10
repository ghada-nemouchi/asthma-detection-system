// screens/AudioScreeningScreen.js
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert
} from 'react-native';
import AudioRecorder from '../components/AudioRecorder';
import { Ionicons } from '@expo/vector-icons';

const AudioScreeningScreen = ({ navigation }) => {
    const [hasResult, setHasResult] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const handleAudioResult = (result) => {
        setLastResult(result);
        setHasResult(true);
        
        if (result.next_action === 'healthy_exit') {
            navigation.replace('HealthyExit', { 
                score: result.asthma_probability * 100,
                source: 'audio'
            });
        } else if (result.next_action === 'continue_to_app') {
            Alert.alert(
                'Proceed to Registration',
                'Based on your audio, you may have asthma. Would you like to create an account for daily monitoring?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Register', onPress: () => navigation.navigate('Register') }
                ]
            );
        } else if (result.next_action === 'consult_doctor') {
            Alert.alert(
                'Consult a Doctor',
                'Your results suggest you should consult a healthcare provider for proper evaluation.',
                [{ text: 'OK' }]
            );
        }
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