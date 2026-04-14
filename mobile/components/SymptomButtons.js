import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const symptoms = [
  { id: 'wheeze', label: 'Wheeze', emoji: '🌬️' },
  { id: 'cough', label: 'Cough', emoji: '🤧' },
  { id: 'chestTightness', label: 'Chest Tightness', emoji: '❤️‍🩹' },
];

export default function SymptomButtons({ onSymptomsChange }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);

  const toggleSymptom = (symptomId) => {
    const newSelection = selectedSymptoms.includes(symptomId)
      ? selectedSymptoms.filter(s => s !== symptomId)
      : [...selectedSymptoms, symptomId];
    
    setSelectedSymptoms(newSelection);
    onSymptomsChange?.(newSelection);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Your Symptoms</Text>
      <View style={styles.buttonRow}>
        {symptoms.map(symptom => (
          <TouchableOpacity
            key={symptom.id}
            onPress={() => toggleSymptom(symptom.id)}
            style={[
              styles.symptomButton,
              selectedSymptoms.includes(symptom.id) && styles.symptomButtonActive
            ]}
          >
            <Text style={styles.symptomEmoji}>{symptom.emoji}</Text>
            <Text style={[
              styles.symptomLabel,
              selectedSymptoms.includes(symptom.id) && styles.symptomLabelActive
            ]}>
              {symptom.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1f2937' },
  buttonRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  symptomButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  symptomButtonActive: { backgroundColor: '#10b981' },
  symptomEmoji: { fontSize: 24, marginBottom: 4 },
  symptomLabel: { fontSize: 12, color: '#4b5563' },
  symptomLabelActive: { color: 'white' },
});