import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import api from '../services/api';

const SymptomsLog = ({ navigation, route }) => {
  const existingSymptoms = route.params?.currentSymptoms || {
    shortnessOfBreath: false,
    coughing: false,
    wheezing: false,
    chestTightness: false,
  };
  const existingSeverity = route.params?.currentSeverity || 3;

    // ✅ ADD THESE - receive current Dashboard values
  const existingNightSymptoms = route.params?.currentNightSymptoms || 0;
  const existingDaySymptoms = route.params?.currentDaySymptoms || 0;
  const existingHeartRate = route.params?.currentHeartRate || 72;
  const existingSteps = route.params?.currentSteps || 5000;
  const existingHasCold = route.params?.currentHasCold || false;
  const existingPef = route.params?.currentPef || 420;
  const existingReliefUse = route.params?.currentReliefUse || 0;
  // Add with other existing params
  const existingRescuePuffsToday = route.params?.currentRescuePuffsToday || 0;
  const existingControllerTaken = route.params?.currentControllerTaken || false;
  const existingRescueStock = route.params?.currentRescueStock || 75;
    

  const [symptoms, setSymptoms] = useState(existingSymptoms);
  const [severity, setSeverity] = useState(existingSeverity);
  const [notes, setNotes] = useState('');
  
  // PEF in L/min (100-700)
  const [pefValue, setPefValue] = useState(420);
  const [personalBest, setPersonalBest] = useState(450);
  const [reliefUse, setReliefUse] = useState(0);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/patients/me');
      const pb = response.data.user.personalBestPef || 450;
      setPersonalBest(pb);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Calculate percentage for display only
  const getPefPercentage = () => {
    return Math.round((pefValue / personalBest) * 100);
  };

  const handleSave = async () => {
    // ✅ FIX: Don't require symptoms - just check if PEF or Relief were entered
    const hasData = pefValue > 0 || reliefUse > 0 || Object.values(symptoms).some(v => v === true);
    
    if (!hasData) {
      Alert.alert(
        'No Data Entered',
        'Please enter PEF value, reliever use, or select symptoms.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip', onPress: () => goBackToDashboard() }
        ]
      );
      return;
    }

      Alert.alert(
        '✅ Symptoms Saved',
        `PEF: ${pefValue} L/min (${getPefPercentage()}%)\nReliever: ${reliefUse}/week\n\nTap "Analyse & Submit" on Dashboard to calculate risk.`,
        [{ text: 'OK', onPress: () => goBackToDashboard() }]
      );
    
  };

  const goBackToDashboard = () => {
  navigation.navigate('Home', { 
    updatedSymptoms: symptoms,
    severity: severity,
    notes: notes || '',
    // ✅ PASS BACK THE VALUES (preserving Dashboard's state)
    nightSymptoms: existingNightSymptoms,  // Keep Dashboard's values
    daySymptoms: existingDaySymptoms,      // Keep Dashboard's values
    heartRate: existingHeartRate,          // Keep Dashboard's values
    steps: existingSteps,                  // Keep Dashboard's values
    hasCold: existingHasCold,              // Keep Dashboard's values
    pefData: { value: pefValue },
    reliefUse: reliefUse,
    rescuePuffsToday: existingRescuePuffsToday,
    controllerTaken: existingControllerTaken,
    rescueStock: existingRescueStock
  });
};

  const handleSkip = () => {
    Alert.alert(
      'Skip Logging',
      'Are you sure you want to skip?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.navigate('Home') }
      ]
    );
  };

  const formatSymptomName = (key) => {
    return key.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Symptoms & Reading</Text>
        <Text style={styles.subtitle}>Complete your daily asthma assessment</Text>
      </View>

      {/* PEF Section - L/min */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🌬️ Peak Flow Reading (L/min)</Text>
        <Text style={styles.pefValue}>
          {pefValue} L/min ({getPefPercentage()}% of personal best)
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={100}
          maximumValue={700}
          step={10}
          value={pefValue}
          onValueChange={setPefValue}
          minimumTrackTintColor="#547bfb"
          maximumTrackTintColor="#e5e7eb"
        />
        <View style={styles.pefLabels}>
          <Text style={styles.pefLabel}>100 L/min</Text>
          <Text style={styles.pefLabel}>400 L/min</Text>
          <Text style={styles.pefLabel}>700 L/min</Text>
        </View>
      </View>

      {/* Reliever Use */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💊 Rescue Inhaler (this week)</Text>
        <View style={styles.reliefButtons}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
            <TouchableOpacity
              key={num}
              style={[styles.reliefButton, reliefUse === num && styles.reliefButtonActive]}
              onPress={() => setReliefUse(num)}
            >
              <Text style={[styles.reliefButtonText, reliefUse === num && styles.reliefButtonTextActive]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.reliefNote}>times per week</Text>
      </View>

      {/* Symptoms */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Symptoms (select all that apply)</Text>
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
        <Text style={styles.sectionTitle}>Severity Level (1-5)</Text>
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

      {/* Notes */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Add any additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} >
          <Text style={styles.saveButtonText}>Save & Return</Text>
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
  pefValue: { fontSize: 24, fontWeight: 'bold', color: '#547bfb', textAlign: 'center', marginBottom: 10 },
  pefLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 5 },
  pefLabel: { fontSize: 12, color: '#999' },
  reliefButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  reliefButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', margin: 2 },
  reliefButtonActive: { backgroundColor: '#547bfb' },
  reliefButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  reliefButtonTextActive: { color: '#fff' },
  reliefNote: { textAlign: 'center', fontSize: 11, color: '#999', marginTop: 8 },
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
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 14 },
  buttonContainer: { flexDirection: 'row', margin: 15, gap: 12, marginBottom: 30 },
  skipButton: { flex: 1, backgroundColor: '#e5e7eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  skipButtonText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 2, backgroundColor: '#547bfb', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SymptomsLog;