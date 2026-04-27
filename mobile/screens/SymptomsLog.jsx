// SymptomsLog.jsx - Full symptom management (preserves all Dashboard data)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';

const SymptomsLog = ({ navigation, route }) => {
  // Get current symptoms from Dashboard
  const existingSymptoms = route.params?.currentSymptoms || {
    shortnessOfBreath: false,
    coughing: false,
    wheezing: false,
    chestTightness: false,
  };
  const existingSeverity = route.params?.currentSeverity || 3;
  const existingHasCold = route.params?.currentHasCold || false;
  
  // Get current health data from Dashboard (passed as params - PRESERVED)
  const existingNightSymptoms = route.params?.currentNightSymptoms ?? 0;
  const existingDaySymptoms = route.params?.currentDaySymptoms ?? 0;
  const existingHeartRate = route.params?.currentHeartRate ?? 72;
  const existingSteps = route.params?.currentSteps ?? 5000;
  const existingPef = route.params?.currentPef ?? 420;
  const existingReliefUse = route.params?.currentReliefUse ?? 0;
  
  // Medication state (preserved)
  const existingRescuePuffs = route.params?.currentRescuePuffs ?? 0;
  const existingControllerTaken = route.params?.currentControllerTaken ?? false;
  const existingRescueStock = route.params?.currentRescueStock ?? 75;
  
  const [symptoms, setSymptoms] = useState(existingSymptoms);
  const [severity, setSeverity] = useState(existingSeverity);
  const [hasCold, setHasCold] = useState(existingHasCold);
  
  const [loading, setLoading] = useState(false);

  const formatSymptomName = (key) => {
    return key.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Send ALL data back to Dashboard (preserving everything)
      navigation.navigate('Home', { 
        // Symptom data (what user might have changed)
        updatedSymptoms: symptoms,
        severity: severity,
        hasCold: hasCold,
        // ALL health data (passed back unchanged - we didn't modify these)
        nightSymptoms: existingNightSymptoms,
        daySymptoms: existingDaySymptoms,
        heartRate: existingHeartRate,
        steps: existingSteps,
        pefData: { value: existingPef },
        reliefUse: existingReliefUse,
        // Medication data (unchanged)
        rescuePuffsToday: existingRescuePuffs,
        controllerTaken: existingControllerTaken,
        rescueStock: existingRescueStock,
      });
      
      Alert.alert('✅ Symptoms Saved', 'Symptoms and cold status updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip',
      'Are you sure you want to skip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.navigate('Home') }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Symptoms</Text>
        <Text style={styles.subtitle}>Report your symptoms</Text>
      </View>

      {/* Specific Symptoms */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🤒 Symptoms (select all that apply)</Text>
        {Object.entries(symptoms).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[styles.symptomItem, value && styles.symptomActive]}
            onPress={() => setSymptoms({ ...symptoms, [key]: !value })}
          >
            <Text style={[styles.symptomText, value && styles.symptomTextActive]}>
              {formatSymptomName(key)}
            </Text>
            {value && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Severity */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 Severity Level (1-5)</Text>
        <View style={styles.severityContainer}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.severityButton, severity === level && styles.severityActive]}
              onPress={() => setSeverity(level)}
            >
              <Text style={[styles.severityText, severity === level && styles.severityTextActive]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cold / Infection */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🤧 Cold / Infection</Text>
        
        <View style={styles.coldRow}>
          <Text style={styles.label}>Do you have cold or flu symptoms?</Text>
          <Switch
            value={hasCold}
            onValueChange={setHasCold}
            trackColor={{ false: '#e5e7eb', true: '#547bfb' }}
            thumbColor={hasCold ? '#fff' : '#f4f4f4'}
          />
        </View>
        
        <Text style={styles.note}>
          Cold or flu symptoms can affect your asthma risk
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#547bfb', paddingTop: 60, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 5 },
  card: { backgroundColor: '#fff', margin: 15, marginBottom: 0, padding: 20, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#333' },
  symptomItem: { padding: 14, backgroundColor: '#f0f0f0', borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symptomActive: { backgroundColor: '#547bfb' },
  symptomText: { fontSize: 16, color: '#333', fontWeight: '500' },
  symptomTextActive: { color: '#fff' },
  checkMark: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  severityContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  severityButton: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  severityActive: { backgroundColor: '#547bfb', transform: [{ scale: 1.05 }] },
  severityText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  severityTextActive: { color: '#fff' },
  coldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '500', color: '#333', flex: 1, marginRight: 16 },
  note: { fontSize: 12, color: '#999', marginTop: 12, fontStyle: 'italic' },
  buttonContainer: { flexDirection: 'row', margin: 15, gap: 12, marginBottom: 30 },
  skipButton: { flex: 1, backgroundColor: '#e5e7eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  skipButtonText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 2, backgroundColor: '#547bfb', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SymptomsLog;