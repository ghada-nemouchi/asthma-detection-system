// screens/HealthyExitScreen.js - CLEAN VERSION (no duplicate styles)
import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    BackHandler, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const HealthyExitScreen = ({ navigation, route }) => {
    const { score = 49, source = 'audio' } = route.params || {};

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.replace('Login');
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    const getScoreMessage = () => {
        if (score < 30) {
            return {
                title: "Excellent Respiratory Health",
                description: "Your results show no concerning patterns. Continue your healthy lifestyle!",
                icon: "🎉",
                color: '#10b981'
            };
        }
        if (score < 50) {
            return {
                title: "Normal Respiratory Pattern",
                description: "No immediate concerns detected. Routine monitoring is recommended.",
                icon: "✅",
                color: '#f59e0b'
            };
        }
        return {
            title: "Borderline Indicators",
            description: "Minor variations detected. Consider follow-up if symptoms develop.",
            icon: "📊",
            color: '#ef4444'
        };
    };

    const message = getScoreMessage();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={[message.color, message.color + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="heart-circle" size={80} color="#fff" />
                    <Text style={styles.emoji}>{message.icon}</Text>
                </View>
                <Text style={styles.title}>{message.title}</Text>
                <Text style={styles.subtitle}>
                    {source === 'audio' ? 'AI Voice Analysis' : 'Health Questionnaire'}
                </Text>
            </LinearGradient>
            
            <View style={styles.card}>
                <Text style={styles.scoreLabel}>Respiratory Health Score</Text>
                <Text style={[styles.scoreValue, { color: message.color }]}>
                    {Math.round(score)}%
                </Text>
                <View style={styles.scoreBar}>
                    <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: message.color }]} />
                </View>
                <Text style={styles.scoreDescription}>{message.description}</Text>
            </View>
            
            <View style={styles.recommendationsBox}>
                <Text style={styles.recommendationsTitle}>💡 Recommendations</Text>
                <Text style={styles.recommendationsText}>
                    • Continue regular physical activity{'\n'}
                    • Monitor for any new or worsening symptoms{'\n'}
                    • Schedule routine check-ups with your healthcare provider{'\n'}
                    • Re-test every 3-6 months or if symptoms develop
                </Text>
            </View>
            
            <TouchableOpacity 
                style={styles.primaryBtn}
                onPress={() => navigation.replace('Login')}
            >
                <Text style={styles.primaryBtnText}>Continue to Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.secondaryBtn}
                onPress={() => navigation.replace('AudioScreening')}
            >
                <Ionicons name="mic" size={20} color="#547bfb" />
                <Text style={styles.secondaryBtnText}>Re-take Screening</Text>
            </TouchableOpacity>
            
            <View style={styles.disclaimerBox}>
                <Ionicons name="warning-outline" size={16} color="#9ca3af" />
                <Text style={styles.disclaimer}>
                    This AI-powered screening tool is for informational purposes only. 
                    It is not a substitute for professional medical advice, diagnosis, or treatment.
                </Text>
            </View>
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
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    emoji: {
        fontSize: 40,
        position: 'absolute',
        bottom: -15,
        right: -10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fff',
        margin: 20,
        marginTop: -20,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    scoreLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    scoreBar: {
        width: width - 88,
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        marginBottom: 16,
        overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    scoreDescription: {
        fontSize: 14,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 20,
    },
    recommendationsBox: {
        backgroundColor: '#eff6ff',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
    },
    recommendationsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 12,
    },
    recommendationsText: {
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 22,
    },
    primaryBtn: {
        backgroundColor: '#547bfb',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryBtn: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    secondaryBtnText: {
        color: '#547bfb',
        fontSize: 14,
        fontWeight: '500',
    },
    disclaimerBox: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 40,
        padding: 12,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        gap: 8,
    },
    disclaimer: {
        flex: 1,
        fontSize: 11,
        color: '#991b1b',
        lineHeight: 16,
    },
});

export default HealthyExitScreen;