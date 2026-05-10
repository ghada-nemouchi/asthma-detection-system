import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function MedicationScreen({ navigation }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'controller',
    dosage: '',
    frequency: '',
    notes: ''
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const response = await api.get('/medications');
      setMedications(response.data);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMedication = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Medication name is required');
      return;
    }

    try {
      if (editingMed) {
        await api.put(`/medications/${editingMed._id}`, formData);
        Alert.alert('Success', 'Medication updated');
      } else {
        await api.post('/medications', formData);
        Alert.alert('Success', 'Medication added');
      }
      setModalVisible(false);
      resetForm();
      loadMedications();
    } catch (error) {
      Alert.alert('Error', 'Failed to save medication');
    }
  };

  const deleteMedication = async (id, name) => {
    Alert.alert(
      'Delete Medication',
      `Remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/medications/${id}`);
            loadMedications();
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      type: 'controller',
      dosage: '',
      frequency: '',
      notes: ''
    });
  };

  const editMedication = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      type: med.type,
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      notes: med.notes || ''
    });
    setModalVisible(true);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'rescue': return '💨';
      case 'controller': return '💊';
      case 'biologic': return '🧬';
      default: return '💊';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💊 My Medications</Text>
        <Text style={styles.subtitle}>Track your asthma medications</Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Medication</Text>
      </TouchableOpacity>

      <ScrollView style={styles.list}>
        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medkit" size={60} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No medications added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your rescue inhaler, controller medications, and others
            </Text>
          </View>
        ) : (
          medications.map((med) => (
            <View key={med._id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medIcon}>{getTypeIcon(med.type)}</Text>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medType}>{med.type}</Text>
                </View>
                <View style={styles.medActions}>
                  <TouchableOpacity onPress={() => editMedication(med)}>
                    <Ionicons name="pencil" size={20} color="#547bfb" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMedication(med._id, med.name)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {(med.dosage || med.frequency) && (
                <View style={styles.medDetails}>
                  {med.dosage && <Text style={styles.detailText}>💊 {med.dosage}</Text>}
                  {med.frequency && <Text style={styles.detailText}>⏰ {med.frequency}</Text>}
                </View>
              )}
              {med.notes && (
                <Text style={styles.notesText}>📝 {med.notes}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal for Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingMed ? 'Edit Medication' : 'Add Medication'}
            </Text>

            <TextInput
              placeholder="Medication Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              style={styles.input}
            />

            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>Type:</Text>
              <View style={styles.typeButtons}>
                {['rescue', 'controller', 'biologic', 'other'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeButton,
                      formData.type === t && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData({...formData, type: t})}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.type === t && styles.typeButtonTextActive
                    ]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              placeholder="Dosage (e.g., 2 puffs, 10mg)"
              value={formData.dosage}
              onChangeText={(text) => setFormData({...formData, dosage: text})}
              style={styles.input}
            />

            <TextInput
              placeholder="Frequency (e.g., twice daily, as needed)"
              value={formData.frequency}
              onChangeText={(text) => setFormData({...formData, frequency: text})}
              style={styles.input}
            />

            <TextInput
              placeholder="Notes (optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveMedication}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#547bfb', padding: 20, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 5 },
  addButton: { flexDirection: 'row', backgroundColor: '#10b981', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
  medCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  medHeader: { flexDirection: 'row', alignItems: 'center' },
  medIcon: { fontSize: 30, marginRight: 12 },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  medType: { fontSize: 12, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  medActions: { flexDirection: 'row', gap: 16 },
  medDetails: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  detailText: { fontSize: 12, color: '#547bfb' },
  notesText: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeContainer: { marginBottom: 16 },
  typeLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#374151' },
  typeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  typeButtonActive: { backgroundColor: '#547bfb' },
  typeButtonText: { color: '#374151' },
  typeButtonTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontWeight: '600' },
  saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#547bfb', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});