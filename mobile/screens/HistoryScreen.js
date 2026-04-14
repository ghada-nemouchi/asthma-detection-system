import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../services/api';

export default function HistoryScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/readings/patient/me');
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
            <Metric label="PEF" value={`${Math.round(item.pef_norm * 100)}%`} />
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