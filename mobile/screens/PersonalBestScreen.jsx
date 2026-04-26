import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Modal 
} from 'react-native';
import api from '../services/api';

export default function PersonalBestScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEducation, setShowEducation] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/patients/me/personal-best-status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePersonalBest = async () => {
    setCalculating(true);
    try {
      const response = await api.post('/patients/me/personal-best');
      if (response.data.success) {
        Alert.alert(
          '✅ Personal Best Calculated!',
          `${response.data.message}\n\nBased on ${response.data.readingsUsed} readings over the past 3 weeks.`,
          [{ text: 'OK', onPress: () => loadStatus() }]
        );
      } else {
        Alert.alert(
          '⚠️ Not Enough Data',
          `${response.data.message}\n\nYou need ${response.data.requiredDays} days of readings. You have ${response.data.currentDays} days.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate personal best');
    } finally {
      setCalculating(false);
    }
  };

  const getZoneInfo = () => {
    if (!status?.personalBestValue) return null;
    const pb = status.personalBestValue;
    return {
      green: { min: pb * 0.8, max: pb, color: '#10b981', label: 'Good Control' },
      yellow: { min: pb * 0.5, max: pb * 0.8, color: '#f59e0b', label: 'Caution' },
      red: { min: 0, max: pb * 0.5, color: '#ef4444', label: 'Medical Alert' }
    };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  const zones = getZoneInfo();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Personal Best PEF</Text>
        <Text style={styles.subtitle}>Your Peak Flow Benchmark</Text>
      </View>

      {/* Current Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Status</Text>
        
        {status?.hasPersonalBest ? (
          <>
            <Text style={styles.pbValue}>{status.personalBestValue} L/min</Text>
            <Text style={styles.pbDate}>
              Calculated: {new Date(status.lastCalculated).toLocaleDateString()}
            </Text>
            {status.isExpired && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ This value is over 6 months old. Consider recalculating!</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataBox}>
            <Text style={styles.noDataText}>📊 No personal best set yet</Text>
            <Text style={styles.noDataSubtext}>
              We need {status?.neededReadings || 14} days of readings to calculate your personal best.
              Current readings: {status?.readingsInLast3Weeks || 0} days
            </Text>
          </View>
        )}
      </View>

      {/* Zone Chart */}
      {zones && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Your Asthma Zones</Text>
          <View style={styles.zoneContainer}>
            <View style={[styles.zoneBar, { backgroundColor: zones.green.color, flex: 0.5 }]}>
              <Text style={styles.zoneLabel}>Green Zone</Text>
              <Text style={styles.zoneRange}>{Math.round(zones.green.min)}-{Math.round(zones.green.max)} L/min</Text>
              <Text style={styles.zoneDesc}>{zones.green.label}</Text>
            </View>
            <View style={[styles.zoneBar, { backgroundColor: zones.yellow.color, flex: 0.3 }]}>
              <Text style={styles.zoneLabel}>Yellow Zone</Text>
              <Text style={styles.zoneRange}>{Math.round(zones.yellow.min)}-{Math.round(zones.yellow.max)} L/min</Text>
              <Text style={styles.zoneDesc}>{zones.yellow.label}</Text>
            </View>
            <View style={[styles.zoneBar, { backgroundColor: zones.red.color, flex: 0.2 }]}>
              <Text style={styles.zoneLabel}>Red Zone</Text>
              <Text style={styles.zoneRange}>{Math.round(zones.red.min)}-{Math.round(zones.red.max)} L/min</Text>
              <Text style={styles.zoneDesc}>{zones.red.label}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <TouchableOpacity 
        style={styles.calculateButton}
        onPress={calculatePersonalBest}
        disabled={calculating}
      >
        {calculating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.calculateButtonText}>
            {status?.hasPersonalBest ? '🔄 Recalculate Personal Best' : '📊 Calculate Personal Best'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.educationButton}
        onPress={() => setShowEducation(true)}
      >
        <Text style={styles.educationButtonText}>📖 Learn About Personal Best PEF</Text>
      </TouchableOpacity>

      {/* Education Modal */}
      <Modal visible={showEducation} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>What is Personal Best PEF?</Text>
              
              <Text style={styles.modalSection}>📋 Definition</Text>
              <Text style={styles.modalText}>
                Your Personal Best Peak Expiratory Flow (PEF) is the highest, most consistent peak flow reading 
                recorded over 2-3 weeks when your asthma is well controlled.
              </Text>

              <Text style={styles.modalSection}>📏 How to Measure</Text>
              <Text style={styles.modalText}>
                • Track for 2-3 weeks when feeling well{'\n'}
                • Take readings at least twice daily (morning/evening){'\n'}
                • Use the same meter every time{'\n'}
                • Take 3 breaths, record the highest value{'\n'}
                • Stand or sit upright consistently
              </Text>

              <Text style={styles.modalSection}>🎯 Why It Matters</Text>
              <Text style={styles.modalText}>
                • Defines your Green (80-100%), Yellow (50-80%), and Red (&lt;50%) zones{'\n'}
                • Early warning: A drop in PEF can show airway narrowing before symptoms start{'\n'}
                • Helps confirm if medication is working effectively
              </Text>

              <Text style={styles.modalSection}>📊 Typical Values</Text>
              <Text style={styles.modalText}>
                • Adults: 400-700 L/min{'\n'}
                • Children: 150-450 L/min{'\n'}
                • Below 200 L/min in adults may indicate severe obstruction
              </Text>

              <Text style={styles.modalSection}>🔄 When to Re-evaluate</Text>
              <Text style={styles.modalText}>
                • Every 6 months{'\n'}
                • If your asthma symptoms change{'\n'}
                • For children as they grow
              </Text>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowEducation(false)}
              >
                <Text style={styles.closeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#547bfb', padding: 30, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 5 },
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 16, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  pbValue: { fontSize: 48, fontWeight: 'bold', color: '#547bfb', textAlign: 'center' },
  pbDate: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 5 },
  warningBox: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 10, marginTop: 15 },
  warningText: { color: '#92400e', fontSize: 12 },
  noDataBox: { alignItems: 'center', padding: 20 },
  noDataText: { fontSize: 18, color: '#666', marginBottom: 10 },
  noDataSubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  zoneContainer: { flexDirection: 'row', height: 120, borderRadius: 12, overflow: 'hidden' },
  zoneBar: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  zoneLabel: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  zoneRange: { color: '#fff', fontSize: 10, marginTop: 4 },
  zoneDesc: { color: '#fff', fontSize: 10, marginTop: 2 },
  calculateButton: { backgroundColor: '#547bfb', margin: 15, padding: 16, borderRadius: 12, alignItems: 'center' },
  calculateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  educationButton: { backgroundColor: '#e5e7eb', marginHorizontal: 15, marginBottom: 30, padding: 16, borderRadius: 12, alignItems: 'center' },
  educationButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#547bfb' },
  modalSection: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#333' },
  modalText: { fontSize: 14, color: '#555', lineHeight: 22 },
  closeButton: { backgroundColor: '#547bfb', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});