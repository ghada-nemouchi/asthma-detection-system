import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import api from '../services/api';
import { storeToken, storeUser } from '../utils/storage';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
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
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'patient',
        age: age ? parseInt(age) : null,
        phone
      });

      const { token, role } = response.data;

      if (role !== 'patient') {
        Alert.alert('Error', 'Something went wrong');
        return;
      }

      await storeToken(token);
      await storeUser({ name, email, role });
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Email may already exist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }} contentContainerStyle={{ padding: 20 }}>
      <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          Create Patient Account
        </Text>

        <TextInput
          placeholder="Full Name *"
          value={name}
          onChangeText={setName}
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        <TextInput
          placeholder="Email *"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 12 }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password * (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        <TextInput
          placeholder="Confirm Password *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        <TextInput
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={{ borderWidth: 1, borderColor: '#547bfb', padding: 12, borderRadius: 8, marginBottom: 20 }}
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{ backgroundColor: '#547bfb', padding: 15, borderRadius: 12, alignItems: 'center' }}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ textAlign: 'center', color: '##547bfb' }}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}