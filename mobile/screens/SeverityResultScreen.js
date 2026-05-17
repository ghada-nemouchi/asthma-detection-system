// screens/SeverityResultScreen.js - NO EMERGENCY CONTACT
import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SeverityResultScreen({ navigation, route }) {
    const { asthmaType, severity, audioProbability, finalScore } = route.params;
    
    return (
        <ScrollView style={styles.container}>
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
                    onPress={() => navigation.replace('Login', { fromSeverity: true, asthmaDetected: true })}
                >
                    <LinearGradient colors={['#547bfb', '#3b82f6']} style={styles.primaryGradient}>
                        <Text style={styles.primaryBtnText}>Continue to App →</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            
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