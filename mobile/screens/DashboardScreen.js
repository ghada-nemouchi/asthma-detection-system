import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getUser, removeToken } from '../utils/storage';
import RiskCard from '../components/RiskCard';
import SymptomButtons from '../components/SymptomButtons';
import SensorSimulator from '../components/SensorSimulator';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('low');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  
  // Simulator values
  const [pef, setPef] = useState(400);
  const [reliefUse, setReliefUse] = useState(2);
  const [nightSymptoms, setNightSymptoms] = useState(0);
  const [daySymptoms, setDaySymptoms] = useState(0);

  // Load user info
  useFocusEffect(
    React.useCallback(() => {
      loadUser();
      fetchLatestReading();
    }, [])
  );

  const loadUser = async () => {
    const userData = await getUser();
    setUser(userData);
  };

  const fetchLatestReading = async () => {
    try {
      const response = await api.get('/readings/patient/me');
      if (response.data && response.data.length > 0) {
        const latest = response.data[0];
        setRiskScore(latest.riskScore || 0);
        setRiskLevel(latest.riskLevel || 'low');
      }
    } catch (error) {
      console.log('No readings yet');
    }
  };

  const submitReading = async () => {
    setLoading(true);
    try {
      const response = await api.post('/readings', {
        night_symptoms: nightSymptoms,
        day_symptoms: daySymptoms,
        pef: pef,
        relief_use: reliefUse,
        symptoms: selectedSymptoms,
        timestamp: new Date().toISOString()
      });

      const newRiskScore = response.data.riskScore;
      const newRiskLevel = response.data.riskLevel;
      
      setRiskScore(newRiskScore);
      setRiskLevel(newRiskLevel);

      // Show alert based on risk level
      if (newRiskLevel === 'critical') {
        Alert.alert(
          '🚨 URGENT EMERGENCY',
          'Critical asthma risk detected!\n\nPlease take your reliever inhaler immediately and contact your doctor.\n\nIf you have difficulty breathing, call emergency services.',
          [
            { text: 'I Understand', style: 'default' },
            { text: 'Call Doctor', onPress: () => Alert.alert('Calling', 'Would connect to doctor') }
          ],
          { cancelable: false }
        );
      } else if (newRiskLevel === 'high') {
        Alert.alert(
          '⚠️ High Risk Warning',
          'Your asthma risk is elevated. Take your reliever medication and monitor your symptoms.\n\nContact your doctor if symptoms worsen.',
          [{ text: 'OK' }]
        );
      } else if (newRiskLevel === 'medium') {
        Alert.alert('📊 Risk Update', 'Your risk is moderate. Continue monitoring your symptoms.');
      }

      // Reset symptoms after submission
      setSelectedSymptoms([]);
      
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit reading. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeToken();
    navigation.replace('Login');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLatestReading();
    setRefreshing(false);
  };

  return (
    <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>Hello, {user?.name?.split(' ')[0] || 'Patient'} 👋</Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>Track your asthma daily</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.navigate('History')} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20 }}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Risk Card */}
        <RiskCard riskScore={riskScore} riskLevel={riskLevel} />

        {/* Sensor Simulator */}
        <SensorSimulator
          onPefChange={setPef}
          onReliefUseChange={setReliefUse}
          onNightSymptomsChange={setNightSymptoms}
          onDaySymptomsChange={setDaySymptoms}
        />

        {/* Symptom Logger */}
        <SymptomButtons onSymptomsChange={setSelectedSymptoms} />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={submitReading}
          disabled={loading}
          style={{
            backgroundColor: '#10b981',
            padding: 18,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 10,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
              Submit Reading
            </Text>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20 }}>
          Your data is encrypted and shared with your doctor
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}