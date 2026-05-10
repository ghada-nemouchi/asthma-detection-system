// screens/ProfileScreen.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, RefreshControl, TextInput 
} from 'react-native';
import { removeToken, removeUser } from '../utils/storage';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons'; 

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [myDoctor, setMyDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit mode states
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    age: '',
    personalBestPef: '',
    asthmaSeverity: '',
    address: ''
  });

  const loadProfile = async () => {
    try {
      console.log('📱 Fetching patient profile from backend...');
      
      // Fetch patient profile
      const response = await api.get('/patients/me');
      
      console.log('✅ Profile fetched:', response.data);
      
      if (response.data.success) {
        setProfile(response.data.user);
        setStats(response.data.stats);
        
        // Fetch doctor info INSIDE loadProfile
        const doctorId = response.data.user.doctorId;
        if (doctorId) {
          try {
            const doctorResponse = await api.get(`/patients/user/${doctorId}`);
            setMyDoctor(doctorResponse.data);
          } catch (err) {
            console.error('Error fetching doctor:', err);
          }
        }
      } else {
        throw new Error('Failed to load profile');
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        phone: profile.phone || '',
        age: profile.age ? String(profile.age) : '',
        personalBestPef: profile.personalBestPef ? String(profile.personalBestPef) : '',
        asthmaSeverity: profile.asthmaSeverity || 'mild',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      const response = await api.put('/patients/me', {
        name: editForm.name,
        phone: editForm.phone,
        age: parseInt(editForm.age) || null,
        personalBestPef: parseInt(editForm.personalBestPef) || null,
        asthmaSeverity: editForm.asthmaSeverity,
        address: editForm.address
      });
      
      if (response.data.success) {
        setProfile(prev => ({ ...prev, ...response.data.user }));
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
        loadProfile(); // Refresh
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeToken();
              await removeUser();
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              navigation.replace('Login');
            }
          }
        }
      ]
    );
  };

  const getRiskColor = (riskLevel) => {
    switch(riskLevel?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.role}>Patient</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalReadings || 0}</Text>
          <Text style={styles.statLabel}>Total Readings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: getRiskColor(profile?.riskLevel) }]}>
            {profile?.riskLevel || 'Unknown'}
          </Text>
          <Text style={styles.statLabel}>Current Risk</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.averagePef || '--'}</Text>
          <Text style={styles.statLabel}>Avg PEF %</Text>
        </View>
      </View>

      {/* Doctor Information Card */}
      {myDoctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Doctor</Text>
          <View style={styles.doctorCard}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>
                {myDoctor.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>Dr. {myDoctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{myDoctor.specialty || 'Pulmonologist'}</Text>
              <Text style={styles.doctorEmail}>{myDoctor.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Personal Information - EDITABLE */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity onPress={() => editing ? saveProfile() : setEditing(true)}>
            <Text style={{ color: '#547bfb', fontWeight: '600' }}>
              {editing ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {editing ? (
          <>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(text) => setEditForm({...editForm, name: text})}
              placeholder="Full Name"
            />
            
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(text) => setEditForm({...editForm, phone: text})}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              value={editForm.age}
              onChangeText={(text) => setEditForm({...editForm, age: text})}
              placeholder="Age"
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              value={editForm.personalBestPef}
              onChangeText={(text) => setEditForm({...editForm, personalBestPef: text})}
              placeholder="Personal Best PEF (L/min)"
              keyboardType="numeric"
            />
            
            {/* Asthma Severity Dropdown */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Asthma Severity</Text>
              <View style={styles.severityOptions}>
                <TouchableOpacity
                  style={[
                    styles.severityOption,
                    editForm.asthmaSeverity === 'mild' && styles.severityOptionSelected
                  ]}
                  onPress={() => setEditForm({...editForm, asthmaSeverity: 'mild'})}
                >
                  <Text style={[
                    styles.severityOptionText,
                    editForm.asthmaSeverity === 'mild' && styles.severityOptionTextSelected
                  ]}>MILD</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.severityOption,
                    editForm.asthmaSeverity === 'moderate' && styles.severityOptionSelected
                  ]}
                  onPress={() => setEditForm({...editForm, asthmaSeverity: 'moderate'})}
                >
                  <Text style={[
                    styles.severityOptionText,
                    editForm.asthmaSeverity === 'moderate' && styles.severityOptionTextSelected
                  ]}>MODERATE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.severityOption,
                    editForm.asthmaSeverity === 'severe' && styles.severityOptionSelected
                  ]}
                  onPress={() => setEditForm({...editForm, asthmaSeverity: 'severe'})}
                >
                  <Text style={[
                    styles.severityOptionText,
                    editForm.asthmaSeverity === 'severe' && styles.severityOptionTextSelected
                  ]}>SEVERE</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.address}
              onChangeText={(text) => setEditForm({...editForm, address: text})}
              placeholder="Address"
              multiline
              numberOfLines={2}
            />
            
            <TouchableOpacity onPress={() => setEditing(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: '#ef4444', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{profile?.name || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile?.email || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Age</Text>
              <Text style={styles.value}>{profile?.age || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile?.phone || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Personal Best PEF</Text>
              <Text style={styles.value}>{profile?.personalBestPef || '400'} L/min</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Asthma Severity</Text>
              <Text style={[
                styles.value,
                profile?.asthmaSeverity === 'severe' && { color: '#ef4444', fontWeight: 'bold' },
                profile?.asthmaSeverity === 'moderate' && { color: '#f59e0b' },
                profile?.asthmaSeverity === 'mild' && { color: '#10b981' }
              ]}>
                {profile?.asthmaSeverity ? profile.asthmaSeverity.toUpperCase() : 'Not set'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{profile?.address || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Member Since</Text>
              <Text style={styles.value}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Build Date</Text>
          <Text style={styles.value}>April 2025</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={() => navigation.navigate('EmergencyContacts')}
      >
        <Ionicons name="alert-circle" size={24} color="#ef4444" />
        <Text style={styles.emergencyButtonText}>Emergency Contacts</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.personalBestButton}
        onPress={() => navigation.navigate('PersonalBest')}
      >
        <Text style={styles.personalBestButtonText}>🎯 Set Personal Best PEF</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
     
      {/* Footer */}
      <Text style={styles.footer}>
        AsthmiCare • Keeping you breathing easy
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    backgroundColor: '#547bfb', 
    padding: 30, 
    alignItems: 'center', 
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  avatar: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  avatarText: { 
    fontSize: 40, 
    fontWeight: 'bold', 
    color: '#547bfb' 
  },
  name: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 5 
  },
  role: { 
    fontSize: 14, 
    color: '#fff', 
    opacity: 0.9 
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#547bfb',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center'
  },
  section: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginBottom: 16, 
    padding: 20, 
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1f2937', 
    borderBottomWidth: 2,
    borderBottomColor: '#547bfb',
    paddingBottom: 8,
    flex: 1
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  label: { 
    fontSize: 15, 
    color: '#6b7280' 
  },
  value: { 
    fontSize: 15, 
    color: '#1f2937', 
    fontWeight: '500' 
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb'
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  severityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  severityOptionSelected: {
    backgroundColor: '#547bfb',
  },
  severityOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  severityOptionTextSelected: {
    color: '#fff',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#547bfb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  doctorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  doctorInfo: {
    flex: 1
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#547bfb',
    marginBottom: 2
  },
  doctorEmail: {
    fontSize: 12,
    color: '#6b7280'
  },
  personalBestButton: { 
    backgroundColor: '#547bfb',
    marginHorizontal: 16, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  personalBestButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  logoutButton: { 
    backgroundColor: '#ef4444', 
    marginHorizontal: 16, 
    marginBottom: 24, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  logoutButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  emergencyButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 30,
    marginHorizontal: 16
  }
});

export default ProfileScreen;