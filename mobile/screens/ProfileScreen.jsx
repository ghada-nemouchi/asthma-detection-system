// screens/ProfileScreen.jsx - Updated to use /api/patients/me
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, RefreshControl 
} from 'react-native';
import { removeToken, removeUser } from '../utils/storage';
import api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [myDoctor, setMyDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      console.log('📱 Fetching patient profile from backend...');
      
      // Fetch patient profile from new endpoint
      const response = await api.get('/patients/me');
      
      console.log('✅ Profile fetched:', response.data);
      
      if (response.data.success) {
        setProfile(response.data.user);
        setStats(response.data.stats);
        
        // Fetch doctor info if patient has a doctor
        if (response.data.user.doctorId) {
          await fetchMyDoctor(response.data.user.doctorId);
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

  // Fetch doctor info
  const fetchMyDoctor = async (doctorId) => {
    try {
      const doctorResponse = await api.get(`/patients/user/${response.data.user.doctorId}`);
      setMyDoctor(doctorResponse.data);
    } catch (error) {
      console.error('Error fetching doctor:', error);
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

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
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
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
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
        style={styles.editButton} 
        onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in the next update!')}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
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
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#547bfb',
    paddingBottom: 8
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
  editButton: { 
    backgroundColor: '#547bfb', 
    marginHorizontal: 16, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  editButtonText: { 
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
  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 30,
    marginHorizontal: 16
  }
});

export default ProfileScreen;