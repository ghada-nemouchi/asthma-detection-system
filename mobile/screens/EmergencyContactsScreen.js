import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function EmergencyContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'parent',
    phone: '',
    email: '',
    isPrimary: false,
    notifyOnCritical: true
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/emergency-contacts');
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    try {
      if (editingContact) {
        await api.put(`/emergency-contacts/${editingContact._id}`, formData);
        Alert.alert('Success', 'Contact updated successfully');
      } else {
        await api.post('/emergency-contacts', formData);
        Alert.alert('Success', 'Emergency contact added');
      }
      
      setModalVisible(false);
      resetForm();
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save emergency contact');
    }
  };

  const deleteContact = async (contactId) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/emergency-contacts/${contactId}`);
              Alert.alert('Success', 'Contact removed');
              loadContacts();
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      relationship: 'parent',
      phone: '',
      email: '',
      isPrimary: false,
      notifyOnCritical: true
    });
  };

  const editContact = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email || '',
      isPrimary: contact.isPrimary,
      notifyOnCritical: contact.notifyOnCritical
    });
    setModalVisible(true);
  };

  const getRelationshipIcon = (relationship) => {
    switch(relationship) {
      case 'parent': return '👨‍👩‍👧';
      case 'spouse': return '💑';
      case 'sibling': return '👥';
      default: return '👤';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Emergency Contacts</Text>
        <Text style={styles.subtitle}>
          These contacts will be notified automatically when your risk level becomes CRITICAL
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Emergency Contact</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#547bfb" style={styles.loader} />
      ) : contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={60} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No emergency contacts added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add family members or friends who should be notified in case of emergency
          </Text>
        </View>
      ) : (
        contacts.map((contact) => (
          <View key={contact._id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View style={styles.contactIcon}>
                <Text style={styles.contactIconText}>
                  {getRelationshipIcon(contact.relationship)}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRelationship}>
                  {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)}
                </Text>
              </View>
              {contact.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>

            <View style={styles.contactDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="call" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{contact.phone}</Text>
              </View>
              {contact.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{contact.email}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons 
                  name={contact.notifyOnCritical ? "notifications" : "notifications-off"} 
                  size={16} 
                  color={contact.notifyOnCritical ? "#10b981" : "#9ca3af"} 
                />
                <Text style={[styles.detailText, { color: contact.notifyOnCritical ? "#10b981" : "#9ca3af" }]}>
                  {contact.notifyOnCritical ? "Will be notified on critical" : "Notifications disabled"}
                </Text>
              </View>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editContact(contact)}
              >
                <Ionicons name="pencil" size={20} color="#547bfb" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteContact(contact._id)}
              >
                <Ionicons name="trash" size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Modal for Add/Edit */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </Text>

            <TextInput
              placeholder="Full Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              style={styles.input}
            />

            <TextInput
              placeholder="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              placeholder="Email (Optional)"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
              style={styles.input}
            />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Relationship:</Text>
              <View style={styles.relationshipButtons}>
                {['parent', 'spouse', 'sibling', 'friend', 'other'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipButton,
                      formData.relationship === rel && styles.relationshipButtonActive
                    ]}
                    onPress={() => setFormData({...formData, relationship: rel})}
                  >
                    <Text style={[
                      styles.relationshipButtonText,
                      formData.relationship === rel && styles.relationshipButtonTextActive
                    ]}>
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Primary Contact</Text>
              <TouchableOpacity
                onPress={() => setFormData({...formData, isPrimary: !formData.isPrimary})}
              >
                <View style={[styles.switch, formData.isPrimary && styles.switchOn]}>
                  <View style={[styles.switchKnob, formData.isPrimary && styles.switchKnobOn]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Notify on Critical Risk</Text>
              <TouchableOpacity
                onPress={() => setFormData({...formData, notifyOnCritical: !formData.notifyOnCritical})}
              >
                <View style={[styles.switch, formData.notifyOnCritical && styles.switchOn]}>
                  <View style={[styles.switchKnob, formData.notifyOnCritical && styles.switchKnobOn]} />
                </View>
              </TouchableOpacity>
            </View>

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
                onPress={saveContact}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#547bfb',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  contactCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactIconText: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  contactRelationship: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contactDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: '#547bfb',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  relationshipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  relationshipButtonActive: {
    backgroundColor: '#547bfb',
  },
  relationshipButtonText: {
    color: '#374151',
  },
  relationshipButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    padding: 2,
  },
  switchOn: {
    backgroundColor: '#10b981',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchKnobOn: {
    transform: [{ translateX: 22 }],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#547bfb',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});