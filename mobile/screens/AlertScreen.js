// screens/AlertScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function AlertScreen() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await api.get('/alerts', { headers: { Authorization: `Bearer ${token}` } });
      setAlerts(res.data);
    } catch {
      // No alerts or backend down — show empty state
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const colorFor = (level) => ({
    critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981',
  }[level] || '#6b7280');

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#547bfb" /></View>;
  }

  if (alerts.length === 0) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>No Alerts</Text>
        <Text style={{ color: '#9ca3af', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
          Alerts appear here when a high or critical risk reading is submitted
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={alerts}
      keyExtractor={item => item._id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={<Text style={s.header}>🔔 Alerts</Text>}
      renderItem={({ item }) => (
        <View style={[s.card, { borderLeftColor: colorFor(item.riskLevel), borderLeftWidth: 4 }]}>
          <View style={s.row}>
            <View style={[s.badge, { backgroundColor: colorFor(item.riskLevel) + '20' }]}>
              <Text style={[s.badgeText, { color: colorFor(item.riskLevel) }]}>
                {item.riskLevel?.toUpperCase()}
              </Text>
            </View>
            <Text style={s.date}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={s.message}>{item.message}</Text>
          <Text style={s.score}>Risk score: {Math.round((item.riskScore || 0) * 100)}%</Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  header:   { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card:     { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:{ fontSize: 12, fontWeight: '700' },
  date:     { fontSize: 12, color: '#9ca3af' },
  message:  { fontSize: 14, color: '#1f2937', fontWeight: '500', marginBottom: 4 },
  score:    { fontSize: 12, color: '#6b7280' },
});
