import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { getUser } from '../utils/storage';
import api from '../services/api';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const userData = await getUser();
    setUser(userData);
    
    try {
      const response = await api.get('/auth/me');
      setPatientData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }} contentContainerStyle={{ padding: 20 }}>
      <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36, color: 'white' }}>👤</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 12 }}>{user?.name || patientData?.name}</Text>
          <Text style={{ color: '#6b7280' }}>{user?.email || patientData?.email}</Text>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 }}>
          <InfoRow label="Age" value={patientData?.age || 'Not provided'} />
          <InfoRow label="Phone" value={patientData?.phone || 'Not provided'} />
          <InfoRow label="Role" value={patientData?.role || 'Patient'} />
          <InfoRow label="Current Risk" value={patientData?.riskLevel?.toUpperCase() || 'Low'} />
          <InfoRow label="Risk Score" value={`${Math.round((patientData?.riskScore || 0) * 100)}%`} />
          <InfoRow label="Personal Best PEF" value={`${patientData?.personalBestPef || 400} L/min`} />
          <InfoRow label="Known Triggers" value={patientData?.knownTriggers?.join(', ') || 'None'} />
        </View>
      </View>
    </ScrollView>
  );
}

const InfoRow = ({ label, value }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
    <Text style={{ color: '#6b7280' }}>{label}</Text>
    <Text style={{ fontWeight: '500', color: '#1f2937' }}>{value || '—'}</Text>
  </View>
);