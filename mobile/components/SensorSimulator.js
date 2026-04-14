import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
export default function SensorSimulator({ onPefChange, onReliefUseChange, onNightSymptomsChange, onDaySymptomsChange }) {
  const [pef, setPef] = useState(400);
  const [reliefUse, setReliefUse] = useState(2);
  const [nightSymptoms, setNightSymptoms] = useState(0);
  const [daySymptoms, setDaySymptoms] = useState(0);

  const handlePefChange = (value) => {
    setPef(value);
    onPefChange?.(value);
  };

  const handleReliefUseChange = (value) => {
    setReliefUse(value);
    onReliefUseChange?.(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 Sensor Simulator</Text>
      <Text style={styles.subtitle}>(For demo – simulates smartwatch data)</Text>

      <View style={styles.sliderContainer}>
        <Text style={styles.label}>PEF Value: {pef} L/min</Text>
        <Slider
          value={pef}
          onValueChange={handlePefChange}
          minimumValue={200}
          maximumValue={600}
          step={10}
          minimumTrackTintColor="#10b981"
        />
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.label}>Reliever Use (per week): {reliefUse}</Text>
        <Slider
          value={reliefUse}
          onValueChange={handleReliefUseChange}
          minimumValue={0}
          maximumValue={15}
          step={1}
          minimumTrackTintColor="#10b981"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfSlider}>
          <Text style={styles.label}>Night Symptoms: {nightSymptoms} days/week</Text>
          <Slider
            value={nightSymptoms}
            onValueChange={(v) => { setNightSymptoms(v); onNightSymptomsChange?.(v); }}
            minimumValue={0}
            maximumValue={7}
            step={1}
            minimumTrackTintColor="#f97316"
          />
        </View>
        <View style={styles.halfSlider}>
          <Text style={styles.label}>Day Symptoms: {daySymptoms} days/week</Text>
          <Slider
            value={daySymptoms}
            onValueChange={(v) => { setDaySymptoms(v); onDaySymptomsChange?.(v); }}
            minimumValue={0}
            maximumValue={7}
            step={1}
            minimumTrackTintColor="#f97316"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  sliderContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  halfSlider: { flex: 1 },
});