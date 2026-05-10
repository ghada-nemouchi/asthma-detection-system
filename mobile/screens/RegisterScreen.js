import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet
} from 'react-native';
import api from '../services/api';
import { storeToken, storeUser, clearAllData, getToken, getUser } from '../utils/storage';
import { disconnectSocket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  
  // 🆕 CHAMPS DE PERSONNALISATION
  const [personalBestPef, setPersonalBestPef] = useState('');
  const [baselineHr, setBaselineHr] = useState('');
  const [baselineSteps, setBaselineSteps] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 REGISTRATION ATTEMPT');
      console.log('📧 Email:', email);
      console.log('👤 Name:', name);
      console.log('🎯 Personal Best PEF:', personalBestPef);
      console.log('❤️ Baseline HR:', baselineHr);
      console.log('👣 Baseline Steps:', baselineSteps);
      
      // ✅ STEP 1: Disconnect any existing socket connection
      console.log('🔌 Disconnecting old socket...');
      disconnectSocket();
      
      // ✅ STEP 2: Clear ALL existing auth data
      console.log('🗑️ Clearing all existing auth data...');
      delete api.defaults.headers.common['Authorization'];
      
      // ✅ REMPLACER clearAllData() par ceci :
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('✅ Auth data cleared');
            
      // ✅ STEP 3: Make registration request avec les champs personnalisés
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'patient',
        age: age ? parseInt(age) : null,
        phone,
        // 🆕 Envoyer les valeurs personnalisées au backend
        personalBestPef: personalBestPef ? parseInt(personalBestPef) : null,
        baselineHr: baselineHr ? parseInt(baselineHr) : null,
        baselineSteps: baselineSteps ? parseInt(baselineSteps) : null
      });

      console.log('✅ Registration response:', response.data);

      // Extract data from response
      const { token, _id, role: userRole, name: userName, email: userEmail } = response.data;

      // Verify role
      if (userRole !== 'patient') {
        Alert.alert('Error', 'Something went wrong');
        return;
      }

      // Store COMPLETE user object with ID
      const completeUser = {
        _id: _id,
        name: userName,
        email: userEmail,
        role: userRole
      };
      
      console.log('💾 Storing complete user:', completeUser);
      console.log('💾 Storing token:', token.substring(0, 20) + '...');
      
      // Store both token and user
      await storeToken(token);
      await storeUser(completeUser);
      
      // ✅ CRITICAL: Mettre à jour les headers axios IMMÉDIATEMENT
      api.defaults.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Updated axios headers with new token');
      // Verification
      const storedTokenAfter = await getToken();
      const storedUserAfter = await getUser();
      console.log('🔐 Verifying stored token:', storedTokenAfter?.substring(0, 30));
      console.log('🔐 Verifying stored user:', storedUserAfter);
      console.log('🔐 Stored user ID:', storedUserAfter?._id);
      console.log('🔐 Stored user email:', storedUserAfter?.email);

      console.log('✅ Registration successful!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // ✅ STEP 4: Navigate to home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data || error.message);
      Alert.alert('Registration Failed', error.response?.data?.message || 'Email may already exist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Patient Account</Text>

        {/* Section Informations de base */}
        <Text style={styles.sectionTitle}>📋 Personal Information</Text>
        
        <TextInput
          placeholder="Full Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        
        <TextInput
          placeholder="Email *"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          placeholder="Password * (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <TextInput
          placeholder="Confirm Password *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
        />
        
        <TextInput
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        {/* 🆕 Section Personnalisation Asthma */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🎯 Asthma Personalization</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 These values help personalize your risk predictions. 
            Ask your doctor if you're not sure.
          </Text>
        </View>

        <TextInput
          placeholder="Personal Best PEF (L/min) - ex: 450"
          value={personalBestPef}
          onChangeText={setPersonalBestPef}
          keyboardType="numeric"
          style={styles.input}
        />
        <Text style={styles.helperText}>
          Your highest Peak Flow reading when feeling well
        </Text>

        <TextInput
          placeholder="Resting Heart Rate (BPM) - ex: 70"
          value={baselineHr}
          onChangeText={setBaselineHr}
          keyboardType="numeric"
          style={styles.input}
        />
        <Text style={styles.helperText}>
          Your normal heart rate at rest (60-100 BPM)
        </Text>

        <TextInput
          placeholder="Daily Steps Baseline - ex: 5000"
          value={baselineSteps}
          onChangeText={setBaselineSteps}
          keyboardType="numeric"
          style={styles.input}
        />
        <Text style={styles.helperText}>
          Your average daily step count
        </Text>

        {/* Boutons */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={styles.registerButton}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.registerButtonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
    color: '#547bfb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  helperText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 12,
    marginTop: -4,
    marginLeft: 4,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1e40af',
  },
  registerButton: {
    backgroundColor: '#547bfb',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    marginTop: 16,
  },
  loginLinkText: {
    textAlign: 'center',
    color: '#547bfb',
    fontSize: 14,
  },
});