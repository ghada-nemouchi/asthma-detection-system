import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { storeToken, storeUser } from '../utils/storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('emma.t@email.com');
  const [password, setPassword] = useState('patient123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, role, name } = response.data;

      if (role !== 'patient') {
        Alert.alert('Error', 'This app is for patients only');
        return;
      }

      await storeToken(token);
      await storeUser({ name, email, role });
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#10b981', '#059669']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 42, fontWeight: 'bold', color: 'white' }}>AsthmiCare</Text>
            <Text style={{ fontSize: 16, color: 'white', marginTop: 8 }}>Patient Portal</Text>
          </View>

          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={{ borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 12, marginBottom: 16 }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{ borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 12, marginBottom: 24 }}
            />

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{ backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 16 }}>
              <Text style={{ textAlign: 'center', color: '#10b981' }}>Don't have an account? Register</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 12 }}>Demo: emma.t@email.com / patient123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}