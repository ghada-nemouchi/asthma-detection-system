// screens/HomeScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import EnvironmentalWidget from '../components/EnvironmentalWidget';
import api from '../services/api';

const HomeScreen = () => {
  const [environmentalData, setEnvironmentalData] = useState({
    temperature: null,
    humidity: null,
    pollenCount: null,
    pollution: null,
  });
  const [todaySymptoms, setTodaySymptoms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEnvironmentalData = async () => {
    try {
      const response = await api.get('/environmental/current');
      setEnvironmentalData(response.data);
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      // Use mock data for testing if API fails
      setEnvironmentalData({
        temperature: 22,
        humidity: 65,
        pollenCount: 'Medium',
        pollution: 42,
      });
    }
  };

  const fetchTodaySymptoms = async () => {
    try {
      const response = await api.get('/symptoms/today');
      setTodaySymptoms(response.data);
    } catch (error) {
      console.error('Error fetching today\'s symptoms:', error);
      // Use mock data for testing
      setTodaySymptoms({
        severity: 2,
        symptoms: ['coughing'],
        logged: false,
      });
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchEnvironmentalData(), fetchTodaySymptoms()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEnvironmentalData(), fetchTodaySymptoms()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <EnvironmentalWidget 
        temperature={environmentalData.temperature}
        humidity={environmentalData.humidity}
        pollenCount={environmentalData.pollenCount}
        pollution={environmentalData.pollution}
      />
      
      {/* Today's Symptoms Section */}
      <View style={styles.symptomsCard}>
        <Text style={styles.sectionTitle}>📋 Today's Symptoms</Text>
        {todaySymptoms?.logged ? (
          <>
            <Text style={styles.symptomSeverity}>Severity: {todaySymptoms.severity}/5</Text>
            <Text style={styles.symptomList}>
              Symptoms: {todaySymptoms.symptoms?.join(', ') || 'None reported'}
            </Text>
          </>
        ) : (
          <Text style={styles.noData}>No symptoms logged today</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  symptomsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  symptomSeverity: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  symptomList: {
    fontSize: 14,
    color: '#4b5563',
  },
  noData: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default HomeScreen;