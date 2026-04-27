import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../services/api';
import { getUser } from '../utils/storage';

export default function HistoryScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personalBest, setPersonalBest] = useState(450);

  useEffect(() => {
    loadPersonalBest();
  }, []);

  useEffect(() => {
    if (personalBest) {
      fetchHistory();
    }
  }, [personalBest]);

  const loadPersonalBest = async () => {
    try {
      // Option 1: Fetch directly from API instead of storage
      const response = await api.get('/patients/me');
      if (response.data?.user?.personalBestPef) {
        setPersonalBest(response.data.user.personalBestPef);
        console.log('✅ Loaded personal best from API:', response.data.user.personalBestPef);
      } else {
        console.log('⚠️ No personal best found, using default 450');
        setPersonalBest(450);
      }
    } catch (error) {
      console.error('Error loading personal best:', error);
      setPersonalBest(450);
    }
  };
  const fetchHistory = async () => {
    try {
      const response = await api.get('/readings/patient/me');
      console.log('📊 History readings:', response.data.map(r => ({
        pef_norm: r.pef_norm,
        personalBest: personalBest,
        calculated: r.pef_norm * personalBest
      })));
      setReadings(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch(riskLevel) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const getActualPef = (pefNorm) => {
    if (!pefNorm || pefNorm === 0) return '—';
    const calculated = Math.round(pefNorm * personalBest);
    if (calculated < 100) return 100;
    if (calculated > 700) return 700;
    return calculated;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (readings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, color: '#6b7280' }}>📭 No readings yet</Text>
        <Text style={{ color: '#9ca3af', marginTop: 8 }}>Submit your first reading from the dashboard</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={readings}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={[styles.card, { borderLeftColor: getRiskColor(item.riskLevel), borderLeftWidth: 4 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskLevel) + '20' }]}>
              <Text style={[styles.riskText, { color: getRiskColor(item.riskLevel) }]}>
                {item.riskLevel?.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <Metric label="Risk Score" value={`${Math.round((item.riskScore || 0) * 100)}%`} />
            <Metric label="PEF" value={`${getActualPef(item.pef_norm)} L/min`} />
            <Metric label="Reliever" value={`${item.relief_use}/week`} />
            <Metric label="Night Symptoms" value={`${item.night_symptoms}/7`} />
            <Metric label="Day Symptoms" value={`${item.day_symptoms}/7`} />
          </View>
        </View>
      )}
    />
  );
}

const Metric = ({ label, value }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 12, color: '#6b7280' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  riskText: { fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
});