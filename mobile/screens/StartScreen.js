// mobile/screens/StartScreen.js
import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar
} from 'react-native';

const { width, height } = Dimensions.get('window');

const StartScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#547bfb" />
            
            {/* Center content */}
            <View style={styles.centerContent}>
                {/* Lung Icon */}
                <View style={styles.iconContainer}>
                    <Image
                        source={require('../assets/images/lungs.png')}
                        style={styles.lungIcon}
                        resizeMode="contain"
                    />
                </View>

                {/* App Name */}
                <Text style={styles.appName}>Asthmicare</Text>
                <Text style={styles.subtitle}>Patient Portal</Text>
            </View>

            {/* Start Button at bottom */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.startButtonText}>start</Text>
                    <Text style={styles.arrowIcon}>→</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#547bfb',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 60,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -60, // Offset to truly center with button below
    },
    iconContainer: {
        marginBottom: 24,
    },
    lungIcon: {
        width: 120,
        height: 120,
        
    },
    appName: {
        fontSize: 36,
        fontWeight: '600',
        color: '#ffffff',
        fontFamily: 'System',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        letterSpacing: 0.5,
    },
    bottomContainer: {
        width: '100%',
        alignItems: 'center',
    },
    startButton: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        maxWidth: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6b7280',
    },
    arrowIcon: {
        fontSize: 18,
        color: '#6b7280',
    },
});

export default StartScreen;