import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import api from '../services/api';

const DoctorRequestScreen = ({ navigation }) => {
  const [pendingRequest, setPendingRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkPendingRequest();
    
    // Set up polling every 10 seconds
    const interval = setInterval(checkPendingRequest, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkPendingRequest = async () => {
    try {
      const response = await api.get('/patients/pending-request');
      if (response.data.hasPendingRequest) {
        setPendingRequest(response.data);
        setShowModal(true);
      } else {
        setPendingRequest(null);
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error checking requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action) => {
    try {
      const response = await api.post(`/patients/respond-request/${pendingRequest.doctor._id}`, {
        action
      });
      
      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        setShowModal(false);
        setPendingRequest(null);
        
        if (action === 'accept') {
          // Refresh patient profile
          navigation.replace('Profile');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.doctorIcon}>
              <Text style={styles.doctorIconText}>👨‍⚕️</Text>
            </View>
            
            <Text style={styles.modalTitle}>Doctor Request</Text>
            
            <Text style={styles.modalMessage}>
              Dr. {pendingRequest?.doctor?.name} wants to be your doctor
            </Text>
            
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorSpecialty}>
                {pendingRequest?.doctor?.specialty || 'Pulmonologist'}
              </Text>
              <Text style={styles.doctorEmail}>
                {pendingRequest?.doctor?.email}
              </Text>
            </View>
            
            <Text style={styles.requestDate}>
              Requested: {new Date(pendingRequest?.requestDate).toLocaleDateString()}
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleResponse('accept')}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={() => handleResponse('reject')}
              >
                <Text style={[styles.buttonText, styles.rejectButtonText]}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {!pendingRequest && (
        <View style={styles.noRequestContainer}>
          <Text style={styles.noRequestEmoji}>✅</Text>
          <Text style={styles.noRequestTitle}>No Pending Requests</Text>
          <Text style={styles.noRequestText}>
            When a doctor requests to add you as a patient, you'll see it here.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  doctorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#547bfb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorIconText: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  doctorInfo: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
  },
  doctorSpecialty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#547bfb',
    textAlign: 'center',
    marginBottom: 4,
  },
  doctorEmail: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  rejectButtonText: {
    color: '#f44336',
  },
  noRequestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noRequestEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noRequestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noRequestText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default DoctorRequestScreen;