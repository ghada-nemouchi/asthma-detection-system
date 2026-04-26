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

  const [symptoms, setSymptoms] = useState(existingSymptoms);
  const [severity, setSeverity] = useState(existingSeverity);
  const [notes, setNotes] = useState('');
  
  const [pefPercentage, setPefPercentage] = useState(100);
  const [personalBest, setPersonalBest] = useState(450);
  const [reliefUse, setReliefUse] = useState(0);
  const [nightSymptoms, setNightSymptoms] = useState(0); // Add night symptoms
  const [loading, setLoading] = useState(false);

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

  const handleSave = async () => {
    const hasSymptoms = Object.values(symptoms).some(value => value === true);
    
    if (!hasSymptoms) {
      Alert.alert(
        'No Symptoms Selected',
        'Please select at least one symptom or tap "Skip" to continue.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip', onPress: () => goBackToDashboard() }
        ]
      );
      return;
    }

    setLoading(true);
    
    try {
      const actualPefValue = Math.round((pefPercentage / 100) * personalBest);
      
      // Calculate night symptoms based on severity (example logic)
      const nightSympValue = severity >= 4 ? 3 : severity >= 2 ? 1 : 0;
      
      const readingData = {
        night_symptoms: nightSympValue,
        day_symptoms: severity,
        pef: actualPefValue,
        relief_use: reliefUse,
        steps: 0,
        mean_hr: 0,
        sleep_minutes: 0,
        temperature: 0,
        aqi: 0,
        hasCold: false
      };
      
      console.log('📊 Submitting from SymptomsLog:', readingData);
      
      await api.post('/readings', readingData);
      
      Alert.alert(
        '✅ Symptoms & Reading Saved',
        `PEF: ${pefPercentage}% (${actualPefValue} L/min)\nReliever: ${reliefUse}/week\nRisk level calculated!`,
        [{ text: 'OK', onPress: () => goBackToDashboard() }]
      );
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToDashboard = () => {
    navigation.navigate('Home', { 
      updatedSymptoms: symptoms,
      severity: severity,
      notes: notes || ''
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

      {/* PEF Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🌬️ Peak Flow Reading</Text>
        <Text style={styles.pefValue}>
          {pefPercentage}% = {Math.round((pefPercentage / 100) * personalBest)} L/min
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={pefPercentage}
          onValueChange={setPefPercentage}
          minimumTrackTintColor="#547bfb"
          maximumTrackTintColor="#e5e7eb"
        />
        <View style={styles.pefLabels}>
          <Text style={styles.pefLabel}>0%</Text>
          <Text style={styles.pefLabel}>50%</Text>
          <Text style={styles.pefLabel}>100%</Text>
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
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save & Analyze'}</Text>
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