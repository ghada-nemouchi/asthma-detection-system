// screens/SeverityResultScreen.js - WITH AUTO-SAVE TO PROFILE
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { initServerIp } from '../services/api';

export default function SeverityResultScreen({ navigation, route }) {
    const { asthmaType, severity, audioProbability, finalScore } = route.params;
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);

    // Check if user is logged in on mount
    useEffect(() => {
        checkUserStatus();
    }, []);

    const checkUserStatus = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Error checking user:', error);
        }
    };

    // Save screening results to user profile
    const saveToProfile = async () => {
        setSaving(true);
        
        try {
            // Initialize server IP if needed
            await initServerIp();
            
            // Get current user from storage
            const userData = await AsyncStorage.getItem('user');
            if (!userData) {
                // No user logged in - store temporarily for later
                await AsyncStorage.setItem('pendingScreening', JSON.stringify({
                    asthmaType: asthmaType.type === 'Allergic (Extrinsic) Asthma' ? 'allergic' : 'nonAllergic', 
                    severity: severity,
                    audioProbability: audioProbability,
                    finalScore: finalScore,
                    timestamp: new Date().toISOString(),
                    ginaStep: severity.gina_step,
                    treatment: severity.treatment
                }));
                
                Alert.alert(
                    'Results Saved Locally',
                    'Your assessment results have been saved. Please create an account to access your full dashboard and track your progress over time.',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Create Account', onPress: () => navigation.replace('Register', { pendingScreening: true }) }
                    ]
                );
                return;
            }
            
            // User is logged in - save directly to profile
            const parsedUser = JSON.parse(userData);
            const token = await AsyncStorage.getItem('token');
            
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            // Prepare update data
            const updateData = {
                asthmaSeverity: getSeverityValue(severity.level),
                asthmaType: asthmaType.type === 'Allergic (Extrinsic) Asthma' ? 'allergic' : 'nonAllergic', 
                ginaStep: severity.gina_step,
                screeningScore: finalScore,
                screeningDate: new Date().toISOString()
            };
            
            if (route.params?.age) {
                updateData.age = parseInt(route.params.age);
            }
            // if (route.params?.bmi) {
            //     updateData.bmi = parseFloat(route.params.bmi);
            // }
            if (route.params?.sex) {
                updateData.sex = route.params.sex;
            }
            // Update user profile via API
            const response = await api.put('/patients/me', updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                // Update local storage
                const updatedUser = { ...parsedUser, ...updateData };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                
                Alert.alert(
                    '✅ Results Saved!',
                    `Your asthma assessment has been saved to your profile.\n\n` +
                    `Type: ${asthmaType.type}\n` +
                    `Severity: ${severity.level}\n` +
                    `GINA Step: ${severity.gina_step}`,
                    [
                        { text: 'Go to Dashboard', onPress: () => navigation.replace('Home') }
                    ]
                );
            } else {
                throw new Error('Failed to save results');
            }
            
        } catch (error) {
            console.error('Error saving to profile:', error);
            
            // Fallback: save locally
            await AsyncStorage.setItem('pendingScreening', JSON.stringify({
                asthmaType: asthmaType,
                severity: severity,
                audioProbability: audioProbability,
                finalScore: finalScore,
                timestamp: new Date().toISOString(),
                age: route.params?.age,
                sex: route.params?.sex,
                // bmi: route.params?.bmi

            }));
            
            Alert.alert(
                'Results Saved Locally',
                'We could not save to your profile right now. Your results have been saved locally and will sync when you log in.',
                [{ text: 'OK' }]
            );
        } finally {
            setSaving(false);
        }
    };
    
    // Helper function to map severity level to database value
    const getSeverityValue = (level) => {
        if (level.includes('Intermittent')) return 'mild';
        if (level.includes('Mild')) return 'mild';
        if (level.includes('Moderate')) return 'moderate';
        if (level.includes('Severe')) return 'severe';
        return 'mild';
    };
    
    // Handle continue button press
    const handleContinue = () => {
        if (user) {
            // User is logged in, save directly
            saveToProfile();
        } else {
            // User not logged in, store pending and go to login/register
            saveToProfile();
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient 
                colors={[severity.color, severity.color + 'cc']} 
                style={styles.header}
            >
                <Ionicons name="medkit-outline" size={70} color="#fff" />
                <Text style={styles.severityTitle}>{severity.level}</Text>
                <Text style={styles.asthmaType}>{asthmaType.type}</Text>
            </LinearGradient>
            
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>AI Probability</Text>
                    <Text style={styles.statValue}>{Math.round((audioProbability || 0) * 100)}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Combined Score</Text>
                    <Text style={styles.statValue}>{finalScore || 0}%</Text>
                </View>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📋 About Your Asthma</Text>
                <Text style={styles.description}>{asthmaType.description}</Text>
                
                <Text style={styles.subTitle}>🎯 Common Triggers:</Text>
                {asthmaType.triggers.map((trigger, index) => (
                    <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{trigger}</Text>
                    </View>
                ))}
                
                <Text style={styles.ginaReference}>📖 {asthmaType.gina_reference}</Text>
            </View>
            
            <View style={[styles.card, { borderLeftColor: severity.color, borderLeftWidth: 4 }]}>
                <Text style={styles.cardTitle}>⚠️ Severity Assessment</Text>
                <Text style={styles.description}>{severity.description}</Text>
                
                <View style={styles.treatmentBox}>
                    <Text style={styles.treatmentTitle}>GINA Treatment Step: {severity.gina_step}</Text>
                    <Text style={styles.treatmentText}>{severity.treatment}</Text>
                </View>
                
                <Text style={styles.subTitle}>📝 Recommendations:</Text>
                <View style={styles.recommendationBox}>
                    <Ionicons name="alert-circle" size={20} color={severity.color} />
                    <Text style={[styles.recommendationText, { color: severity.color }]}>{severity.recommendation}</Text>
                </View>
                
                <Text style={styles.subTitle}>💡 Action Plan:</Text>
                {asthmaType.recommendations.map((rec, index) => (
                    <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{rec}</Text>
                    </View>
                ))}
            </View>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={styles.primaryBtn}
                    onPress={handleContinue}
                    disabled={saving}
                >
                    <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.primaryGradient}>
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryBtnText}>
                                {user ? 'Save to My Profile →' : 'Continue to App →'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            
            {!user && (
                <Text style={styles.pendingText}>
                    💾 Your results will be saved and linked to your account when you register/login
                </Text>
            )}
            
            <Text style={styles.disclaimer}>
                Based on GINA 2025 guidelines. This assessment is AI-powered. Always consult a healthcare provider for definitive diagnosis and treatment.
            </Text>
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
        paddingBottom: 40,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    severityTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
        textAlign: 'center',
    },
    asthmaType: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
        textAlign: 'center',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        margin: 16,
        marginTop: -20,
        padding: 20,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        marginTop: 0,
        padding: 20,
        borderRadius: 16,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingLeft: 4,
    },
    bullet: {
        fontSize: 14,
        color: '#547bfb',
        marginRight: 8,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    treatmentBox: {
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 12,
        marginVertical: 12,
    },
    treatmentTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 4,
    },
    treatmentText: {
        fontSize: 13,
        color: '#1e40af',
        lineHeight: 18,
    },
    recommendationBox: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 12,
        marginVertical: 12,
        gap: 8,
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    ginaReference: {
        fontSize: 11,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    buttonContainer: {
        padding: 16,
    },
    primaryBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    primaryGradient: {
        padding: 16,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    pendingText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#6b7280',
        marginHorizontal: 16,
        marginTop: -8,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    disclaimer: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        margin: 16,
        marginTop: 0,
        marginBottom: 30,
        lineHeight: 16,
    },
});