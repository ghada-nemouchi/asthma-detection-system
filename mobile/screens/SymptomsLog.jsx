import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';

const SymptomsLog = ({ navigation, route }) => {
  // Get existing symptoms from route params if coming from Dashboard
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

  const handleSave = () => {
    // Check if at least one symptom is selected
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

    // Show success message
    Alert.alert(
      '✅ Symptoms Saved',
      'Your symptoms have been logged successfully.',
      [
        {
          text: 'OK',
          onPress: () => goBackToDashboard()
        }
      ]
    );
  };

  const goBackToDashboard = () => {
    // Pass the updated symptoms back to Dashboard
    navigation.navigate('Dashboard', { 
      updatedSymptoms: symptoms,
      severity: severity,
      notes: notes
    });
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Logging',
      'Are you sure you want to skip logging your symptoms?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => navigation.goBack() }
      ]
    );
  };

  // Toggle severity - allows changing by clicking again
  const handleSeverityChange = (level) => {
    setSeverity(level);
  };

  // Format symptom key for display
  const formatSymptomName = (key) => {
    return key.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Symptoms</Text>
        <Text style={styles.subtitle}>Track your daily asthma symptoms</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Symptoms (select all that apply)</Text>
        {Object.entries(symptoms).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[styles.symptomItem, value && styles.symptomActive]}
            onPress={() => setSymptoms({ ...symptoms, [key]: !value })}
            activeOpacity={0.7}
          >
            <Text style={[styles.symptomText, value && styles.symptomTextActive]}>
              {formatSymptomName(key)}
            </Text>
            {value && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Severity Level (1-5)</Text>
        <Text style={styles.severitySubtext}>
          Tap any number to change severity
        </Text>
        <View style={styles.severityContainer}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.severityButton, 
                severity === level && styles.severityActive
              ]}
              onPress={() => handleSeverityChange(level)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.severityText, 
                severity === level && styles.severityTextActive
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.severityLabels}>
          <Text style={styles.severityLabelText}>Mild</Text>
          <Text style={styles.severityLabelText}>Moderate</Text>
          <Text style={styles.severityLabelText}>Severe</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Add any additional notes about your symptoms, triggers, or medications..."
          placeholderTextColor="#999"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Symptoms</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    padding: 20, 
    backgroundColor: '#547bfb', 
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#fff', 
    opacity: 0.9, 
    marginTop: 5 
  },
  card: { 
    backgroundColor: '#fff', 
    margin: 15, 
    marginBottom: 0, 
    padding: 20, 
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15, 
    color: '#333' 
  },
  severitySubtext: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic'
  },
  symptomItem: { 
    padding: 14, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 10, 
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  symptomActive: { 
    backgroundColor: '#547bfb' 
  },
  symptomText: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '500'
  },
  symptomTextActive: { 
    color: '#fff' 
  },
  checkMark: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold'
  },
  severityContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    marginVertical: 10
  },
  severityButton: { 
    width: 55, 
    height: 55, 
    borderRadius: 28, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  severityActive: { 
    backgroundColor: '#547bfb',
    transform: [{ scale: 1.05 }]
  },
  severityText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  severityTextActive: { 
    color: '#fff' 
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 10
  },
  severityLabelText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center'
  },
  textInput: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    padding: 12, 
    height: 100, 
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333'
  },
  buttonContainer: {
    flexDirection: 'row',
    margin: 15,
    gap: 12
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600'
  },
  saveButton: { 
    flex: 2,
    backgroundColor: '#547bfb', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#547bfb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default SymptomsLog;