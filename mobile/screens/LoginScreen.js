// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Login attempt for:', email);
      
      // Make API request
      const response = await api.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      console.log('✅ Login response received:', response.data);
      
      // Extract data from response
      const token = response.data.token;
      
      // Store user with both _id and id fields
      const userData = {
        _id: response.data._id,  // Add this for socket
        id: response.data._id,   // Keep for compatibility
        name: response.data.name,
        email: response.data.email,
        role: response.data.role
      };
      
      console.log('User data to store:', userData);
      
      // Validate response
      if (!token) {
        console.error('❌ No token in response');
        setError('Invalid server response. Please try again.');
        setLoading(false);
        return;
      }
      
      // Check role - only patients can use this app
      if (userData.role !== 'patient') {
        console.log('❌ Wrong role:', userData.role);
        setError(`This app is for patients only. Your role is: ${userData.role || 'unknown'}`);
        setLoading(false);
        return;
      }
      
      // Store credentials using AsyncStorage directly
      console.log('💾 Storing token and user data...');
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Also set in api default headers
      api.defaults.headers.Authorization = `Bearer ${token}`;
      
      // Verify storage
      const verifyToken = await AsyncStorage.getItem('token');
      const verifyUser = await AsyncStorage.getItem('user');
      console.log('Verification - Token stored:', !!verifyToken);
      console.log('Verification - User stored:', verifyUser);
      
      if (!verifyToken) {
        console.error('❌ Token storage failed');
        setError('Failed to save login information. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Login successful! Navigating to Dashboard...');
      
      // Navigate to Dashboard
      navigation.replace('Home');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error;
        
        if (status === 401) {
          setError('Invalid email or password');
        } else if (status === 404) {
          setError('User not found. Please register first.');
        } else if (message) {
          setError(message);
        } else {
          setError('Login failed. Please try again.');
        }
      } else if (error.request) {
        setError('Cannot connect to server. Check your internet connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#547bfb' }}>
      <StatusBar barStyle="light-content" backgroundColor="#547bfb" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top blue section with logo */}
          <View style={{ 
            minHeight: 220, 
            paddingHorizontal: 32, 
            paddingTop: 48, 
            paddingBottom: 80,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Faint lung watermark */}
            <View style={{
              position: 'absolute',
              right: 14,
              top: 40,
              width: 100,
              height: 100,
            }}>
              <Image 
                source={require('../assets/images/lungs.png')} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="contain"
              />
            </View>

            {/* App name & tagline */}
            <View style={{ zIndex: 1 }}>
              <Text style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: 'white',
                letterSpacing: 0.5,
                marginBottom: 8
              }}>
                AsthmiCare
              </Text>
              <Text style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 14,
                lineHeight: 20,
                maxWidth: 200
              }}>
                Intelligent Asthma Monitoring & Prediction
              </Text>
            </View>
          </View>

          {/* White card overlapping the blue section */}
          <View style={{
            flex: 1,
            backgroundColor: 'white',
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingHorizontal: 28,
            paddingTop: 40,
            paddingBottom: Platform.OS === 'ios' ? 40 : 32,
            marginTop: -28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 15,
          }}>
            <Text style={{ 
              fontSize: 28, 
              fontWeight: 'bold', 
              color: '#1f2937',
              marginBottom: 8
            }}>
              Welcome Back
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 32
            }}>
              Sign in to monitor your asthma
            </Text>

            {/* Error message */}
            {error ? (
              <View style={{
                marginBottom: 20,
                padding: 14,
                backgroundColor: '#fef2f2',
                borderWidth: 1,
                borderColor: '#fecaca',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
                <Text style={{ color: '#dc2626', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: error && !email ? '#dc2626' : '#e5e7eb',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: '#f9fafb',
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 18 }}>📧</Text>
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                style={{ flex: 1, fontSize: 15, color: '#374151', padding: 0 }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: error && !password ? '#dc2626' : '#e5e7eb',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: '#f9fafb',
              marginBottom: 12
            }}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                secureTextEntry
                style={{ flex: 1, fontSize: 15, color: '#374151', padding: 0 }}
              />
            </View>

            {/* Forgot password */}
            <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={() => Alert.alert('Reset Password', 'Password reset feature will be available soon. Please contact support.')}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#547bfb', fontSize: 13, fontWeight: '500' }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={{
                width: '100%',
                backgroundColor: '#547bfb',
                paddingVertical: 16,
                borderRadius: 16,
                marginBottom: 20,
                opacity: loading ? 0.7 : 1,
                shadowColor: '#547bfb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text style={{ 
                  color: 'white', 
                  fontWeight: '700', 
                  fontSize: 16,
                  textAlign: 'center'
                }}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginVertical: 24 
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
              <Text style={{ marginHorizontal: 16, color: '#9ca3af', fontSize: 12 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
            </View>

            {/* Demo credentials hint */}
            <View style={{
              backgroundColor: '#f0fdf4',
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#bbf7d0'
            }}>
              <Text style={{ color: '#166534', fontSize: 12, textAlign: 'center' }}>
                💡 Demo: Use "bilel@gmail.fr" to test doctor request
              </Text>
            </View>

            {/* Sign up link */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#6b7280', fontSize: 14 }}>
                Don't have an account?{' '}
                <Text 
                  onPress={() => navigation.navigate('Register')}
                  style={{ color: '#547bfb', fontWeight: '700' }}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}