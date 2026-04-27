import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Modal 
} from 'react-native';
import api from '../services/api';

export default function PersonalBestScreen({ navigation }) {
  // ✅ ALL HOOKS FIRST - top level, unconditional
  const [status, setStatus] = useState(null);
  const [allReadings, setAllReadings] = useState([]);
  const [truePersonalBest, setTruePersonalBest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEducation, setShowEducation] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [recentReadings, setRecentReadings] = useState([]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load recent readings after data changes
  useEffect(() => {
    if (!loading && allReadings.length > 0) {
      const loadRecentReadings = async () => {
        const readings = await getRecentReadings();
        setRecentReadings(readings);
      };
      loadRecentReadings();
    }
  }, [loading, allReadings]);

  // Helper function to get recent readings with PEF values
  const getRecentReadings = async () => {
    if (!allReadings || allReadings.length === 0) return [];
    
    try {
      const profileResponse = await api.get('/patients/me');
      const personalBestPef = profileResponse.data.user?.personalBestPef || 400;
      
      return allReadings.slice(-7).reverse().map(reading => {
        let pefValue = null;
        if (reading.pef_norm !== undefined && reading.pef_norm !== null) {
          pefValue = Math.round(reading.pef_norm * personalBestPef);
        }
        
        return {
          date: new Date(reading.timestamp || reading.createdAt || reading.date).toLocaleDateString(),
          pef: pefValue,
          riskLevel: reading.riskLevel
        };
      }).filter(r => r.pef !== null);
    } catch (error) {
      console.error('Error getting recent readings:', error);
      return [];
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Get personal best status from backend
      const statusResponse = await api.get('/patients/me/personal-best-status');
      setStatus(statusResponse.data);
      
      // 2. Get ALL readings
      const readingsResponse = await api.get('/readings/patient/me');
      const readings = readingsResponse.data;
      setAllReadings(readings);
      
      // 3. Calculate TRUE personal best from readings
      if (readings && readings.length > 0) {
        const profileResponse = await api.get('/patients/me');
        const personalBestPef = profileResponse.data.user?.personalBestPef || 400;
        
        const pefValues = readings
          .filter(reading => reading.pef_norm !== undefined && reading.pef_norm !== null)
          .map(reading => Math.round(reading.pef_norm * personalBestPef));
        
        if (pefValues.length > 0) {
          const maxPEF = Math.max(...pefValues);
          setTruePersonalBest(maxPEF);
          console.log('📊 Personal Best from profile:', personalBestPef);
          console.log('📊 Calculated PEF values from readings:', pefValues);
          console.log('🎯 True Personal Best (max from readings):', maxPEF);
        } else {
          console.log('⚠️ No pef_norm values found in readings');
        }
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load personal best data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePersonalBest = async () => {
    setCalculating(true);
    try {
      const response = await api.post('/patients/me/personal-best');
      if (response.data.success) {
        await loadData();
        Alert.alert(
          '✅ Personal Best Calculated!',
          `${response.data.message}\n\nBased on ${response.data.readingsUsed} readings over the past 3 weeks.\nYour new personal best: ${response.data.newPersonalBest} L/min`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '⚠️ Not Enough Data',
          `${response.data.message}\n\nYou need ${response.data.requiredDays} days of readings. You have ${response.data.currentDays} days.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert('Error', 'Failed to calculate personal best');
    } finally {
      setCalculating(false);
    }
  };

  const getZoneInfo = () => {
    const pbValue = truePersonalBest || status?.personalBestValue || 400;
    
    if (!pbValue) return null;
    
    return {
      value: pbValue,
      green: { min: pbValue * 0.8, max: pbValue, color: '#10b981', label: 'Good Control' },
      yellow: { min: pbValue * 0.5, max: pbValue * 0.8, color: '#f59e0b', label: 'Caution' },
      red: { min: 0, max: pbValue * 0.5, color: '#ef4444', label: 'Medical Alert' }
    };
  };

  // ✅ Early return AFTER all hooks
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  const zones = getZoneInfo();
  const bestFromReadings = truePersonalBest || status?.personalBestValue || 400;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Personal Best PEF</Text>
        <Text style={styles.subtitle}>Your Peak Flow Benchmark</Text>
      </View>

      {/* Current Best Value */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 Your Personal Best</Text>
        <Text style={styles.pbValue}>{bestFromReadings} L/min</Text>
        <Text style={styles.pbSubtext}>
          Based on {allReadings.length} total readings
        </Text>
        
        {status?.lastCalculated && (
          <Text style={styles.pbDate}>
            Last calculated: {new Date(status.lastCalculated).toLocaleDateString()}
          </Text>
        )}
        
        {truePersonalBest && status?.personalBestValue && truePersonalBest > status.personalBestValue && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              🎉 Your true best ({truePersonalBest} L/min) is higher than stored ({status.personalBestValue} L/min)!
              Click "Recalculate" below to update.
            </Text>
          </View>
        )}
        
        {status?.isExpired && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ This value is over 6 months old. Consider recalculating!</Text>
          </View>
        )}
      </View>

      {/* Zone Chart */}
      {zones && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Your Asthma Zones</Text>
          <Text style={styles.zoneNote}>
            Based on personal best: {Math.round(zones.value)} L/min
          </Text>
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

      {/* Recent Readings */}
      {recentReadings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Recent Peak Flow Readings</Text>
          {recentReadings.map((reading, index) => (
            <View key={index} style={styles.readingRow}>
              <Text style={styles.readingDate}>{reading.date}</Text>
              <Text style={[
                styles.readingValue,
                reading.pef >= (zones?.green?.min || 0) ? styles.greenText :
                reading.pef >= (zones?.yellow?.min || 0) ? styles.yellowText :
                styles.redText
              ]}>
                {reading.pef} L/min
              </Text>
              {reading.riskLevel && (
                <Text style={styles.readingRisk}>{reading.riskLevel}</Text>
              )}
            </View>
          ))}
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
  pbValue: { fontSize: 52, fontWeight: 'bold', color: '#547bfb', textAlign: 'center' },
  pbSubtext: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 5 },
  pbDate: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 5 },
  zoneNote: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 12 },
  warningBox: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 10, marginTop: 15 },
  warningText: { color: '#92400e', fontSize: 12 },
  noDataBox: { alignItems: 'center', padding: 20 },
  noDataText: { fontSize: 18, color: '#666', marginBottom: 10 },
  noDataSubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  zoneContainer: { flexDirection: 'row', height: 120, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  zoneBar: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  zoneLabel: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  zoneRange: { color: '#fff', fontSize: 10, marginTop: 4 },
  zoneDesc: { color: '#fff', fontSize: 10, marginTop: 2 },
  readingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  readingDate: { fontSize: 12, color: '#666', flex: 1 },
  readingValue: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  readingRisk: { fontSize: 12, color: '#999', flex: 1, textAlign: 'right' },
  greenText: { color: '#10b981' },
  yellowText: { color: '#f59e0b' },
  redText: { color: '#ef4444' },
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