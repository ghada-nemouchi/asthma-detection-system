// screens/HealthyExitScreen.js
import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HealthyExitScreen = ({ navigation, route }) => {
    const { score, source = 'audio' } = route.params || { score: 15, source: 'audio' };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="heart-circle" size={80} color="#10b981" />
                <Text style={styles.emoji}>✅</Text>
            </View>
            
            <Text style={styles.title}>You appear Healthy!</Text>
            <Text style={styles.subtitle}>
                Based on the {source === 'audio' ? 'audio analysis' : 'questionnaire'}, you have a low probability of asthma.
            </Text>
            
            <View style={styles.card}>
                <Text style={styles.scoreLabel}>Health Score</Text>
                <Text style={styles.scoreValue}>{Math.round(score || 15)}%</Text>
                <Text style={styles.scoreNote}>
                    {score < 20 ? "You're in excellent respiratory health!" : 
                     score < 40 ? "Your respiratory health looks good." :
                     "Minor indicators - monitor any changes."}
                </Text>
            </View>
            
            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>📋 What this means</Text>
                <Text style={styles.infoText}>
                    • No immediate concerns detected{'\n'}
                    • Continue healthy lifestyle{'\n'}
                    • If symptoms develop, you can re-test anytime
                </Text>
            </View>
            
            
            <TouchableOpacity 
                style={styles.primaryBtn}
                onPress={() => navigation.replace('Login')}
            >
                <Text style={styles.primaryBtnText}>Go to Login</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
                ⚠️ This is a screening tool. Not a medical diagnosis. 
                Consult a healthcare provider for proper evaluation.
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 20,
    },
    emoji: {
        fontSize: 60,
        marginTop: -30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#10b981',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        color: '#6b7280',
        marginHorizontal: 32,
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
    },
    scoreLabel: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 52,
        fontWeight: 'bold',
        color: '#10b981',
    },
    scoreNote: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    infoBox: {
        backgroundColor: '#eff6ff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 22,
    },
    primaryBtn: {
        backgroundColor: '#547bfb',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    secondaryBtnText: {
        color: '#547bfb',
        fontSize: 14,
        fontWeight: '600',
    },
    disclaimer: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 11,
        margin: 16,
        marginBottom: 40,
    },
});

export default HealthyExitScreen;