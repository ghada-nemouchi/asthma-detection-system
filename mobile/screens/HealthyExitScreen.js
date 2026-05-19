// screens/HealthyExitScreen.js - Professional Medical Assessment Screen
import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    BackHandler, Dimensions, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const HealthyExitScreen = ({ navigation, route }) => {
    const { 
        score = 49, 
        source = 'audio', 
        severity = 'moderate', 
        message: resultMessage,
        isAshmatic = false  // This determines if user has asthma or not
    } = route.params || {};
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();
    }, []);
    
    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.replace('Login');
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);
    
    // Clinical assessment based on score and asthma status
    const getClinicalAssessment = () => {
        // If user is NOT asthmatic, show Healthy status (no risk labels)
        if (!isAshmatic) {
            return {
                
                status: 'Healthy',
                description: 'No asthma indicators detected. Your respiratory health assessment shows normal patterns.',
                color: '#10b981',
                gradient: ['#10b981', '#059669'],
                icon: 'medal-outline',
                recommendations: [
                    'Continue maintaining healthy lifestyle practices',
                    'Annual routine health check-up recommended',
                    'Regular physical activity supports lung health',
                    'Follow up if new respiratory symptoms develop'
                ]
            };
        }
        
        // For asthmatic users, show risk assessment based on score
        if (score < 30) {
            return {
                
                status: 'Optimal',
                description: 'Your asthma is well-controlled. No significant abnormalities detected.',
                color: '#10b981',
                gradient: ['#10b981', '#059669'],
                icon: 'medal-outline',
                recommendations: [
                    'Continue current asthma management plan',
                    'Annual routine check-up recommended',
                    'Maintain regular physical activity',
                    'Keep rescue inhaler accessible'
                ]
            };
        }
        if (score < 50) {
            return {
                
                status: 'Mild Risk',
                description: 'Minor respiratory variations observed. Clinical correlation advised.',
                color: '#f59e0b',
                gradient: ['#f59e0b', '#d97706'],
                icon: 'fitness-outline',
                recommendations: [
                    'Schedule follow-up in 3 months',
                    'Monitor for wheezing or shortness of breath',
                    'Consider pulmonary function testing',
                    'Avoid known respiratory irritants'
                ]
            };
        }
        if (score < 70) {
            return {
                
                status: 'Moderate Risk',
                description: 'Notable respiratory patterns detected. Medical evaluation recommended.',
                color: '#ef4444',
                gradient: ['#ef4444', '#dc2626'],
                icon: 'warning-outline',
                recommendations: [
                    'Consult healthcare provider within 2-4 weeks',
                    'Complete pulmonary function testing',
                    'Document symptom frequency and triggers',
                    'Review medication history with physician'
                ]
            };
        }
        return {
            
            status: 'High Risk',
            description: 'Significant respiratory concerns identified. Prompt medical evaluation strongly advised.',
            color: '#7f1d1d',
            gradient: ['#7f1d1d', '#991b1b'],
            icon: 'alert-circle-outline',
            recommendations: [
                'URGENT: Schedule medical evaluation within 1-2 weeks',
                'Complete comprehensive pulmonary assessment',
                'Avoid triggers and maintain symptom diary',
                'Discuss treatment options with pulmonologist'
            ]
        };
    };
    
    const assessment = getClinicalAssessment();
    
    // Get source display text
    const getSourceDisplay = () => {
        switch(source) {
            case 'audio': return 'AI Voice Analysis';
            case 'combined': return 'Multimodal Assessment';
            case 'questionnaire': return 'Clinical Questionnaire';
            default: return 'Respiratory Screening';
        }
    };
    
    // Get severity badge color
    const getSeverityBadge = () => {
        // For healthy users, show "No Asthma Detected"
        if (!isAshmatic) {
            return { bg: '#d1fae5', text: '#065f46', label: 'No Asthma Detected' };
        }
        switch(severity) {
            case 'high': return { bg: '#fee2e2', text: '#991b1b', label: 'High' };
            case 'moderate': return { bg: '#fed7aa', text: '#92400e', label: 'Moderate' };
            case 'mild': return { bg: '#d1fae5', text: '#065f46', label: 'Mild' };
            default: return { bg: '#e0e7ff', text: '#3730a3', label: 'Low' };
        }
    };
    
    const severityBadge = getSeverityBadge();
    
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={assessment.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Animated.View 
                    style={[
                        styles.headerContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name={assessment.icon} size={70} color="#fff" />
                    </View>
                    
                    <Text style={styles.status}>
                        {isAshmatic ? `${assessment.status} Risk` : assessment.status}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: severityBadge.bg }]}>
                        <Text style={[styles.badgeText, { color: severityBadge.text }]}>
                            {severityBadge.label} {!isAshmatic ? '' : 'Suspicion'}
                        </Text>
                    </View>
                </Animated.View>
            </LinearGradient>
            
            <Animated.View 
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                {/* Score Card */}
                <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Respiratory Health Index</Text>
                    <Text style={[styles.scoreValue, { color: assessment.color }]}>
                        {Math.round(score)}<Text style={styles.scorePercent}>/100</Text>
                    </Text>
                    <View style={styles.scoreBarContainer}>
                        <View style={styles.scoreBar}>
                            <View 
                                style={[
                                    styles.scoreBarFill, 
                                    { width: `${score}%`, backgroundColor: assessment.color }
                                ]} 
                            />
                        </View>
                    </View>
                    <Text style={styles.scoreDescription}>
                        {resultMessage || assessment.description}
                    </Text>
                    <View style={styles.sourceBadge}>
                        <Ionicons name="analytics-outline" size={14} color="#6b7280" />
                        <Text style={styles.sourceText}>
                            Assessment Source: {getSourceDisplay()}
                        </Text>
                    </View>
                </View>
                
                {/* Clinical Recommendations */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="medkit-outline" size={22} color="#547bfb" />
                        <Text style={styles.sectionTitle}>Clinical Recommendations</Text>
                    </View>
                    {assessment.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                            <View style={[styles.bulletPoint, { backgroundColor: assessment.color }]} />
                            <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                    ))}
                </View>
                
                {/* Additional Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={22} color="#547bfb" />
                        <Text style={styles.sectionTitle}>Important Information</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#547bfb" />
                        <Text style={styles.infoText}>
                            This AI-powered screening analyzes respiratory patterns using advanced machine learning algorithms. Results should be interpreted by qualified healthcare professionals.
                        </Text>
                    </View>
                </View>
                
                {/* Action Buttons */}
                <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => navigation.replace('Login')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#547bfb', '#3b82f6']}
                        style={styles.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.primaryButtonText}>Return to Login</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => navigation.replace('ScreeningTest')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh-circle" size={22} color="#547bfb" />
                    <Text style={styles.secondaryButtonText}>Initiate New Screening</Text>
                </TouchableOpacity>
                
                {/* Medical Disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Ionicons name="document-text-outline" size={18} color="#9ca3af" />
                    <Text style={styles.disclaimerText}>
                        Medical Disclaimer: This screening tool provides informational insights only 
                        and does not constitute medical advice. Always consult a licensed healthcare 
                        provider for proper diagnosis and treatment.
                    </Text>
                </View>
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 50,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerContent: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
   
    status: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
        marginTop: -20,
    },
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 20,
    },
    scoreLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    scorePercent: {
        fontSize: 24,
        fontWeight: '400',
        color: '#9ca3af',
    },
    scoreBarContainer: {
        width: '100%',
        marginBottom: 20,
    },
    scoreBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    scoreDescription: {
        fontSize: 14,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
    },
    sourceText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    recommendationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 12,
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#1e40af',
        lineHeight: 18,
    },
    primaryButton: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#547bfb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryGradient: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    secondaryButtonText: {
        color: '#547bfb',
        fontSize: 15,
        fontWeight: '500',
    },
    disclaimerBox: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 40,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 11,
        color: '#991b1b',
        lineHeight: 16,
    },
});

export default HealthyExitScreen;