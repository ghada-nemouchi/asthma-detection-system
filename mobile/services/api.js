// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your computer's IP address from the network / just write in cmd . ipconfig and copy both here and in socket,
const YOUR_COMPUTER_IP = '192.168.100.15'; 
const PORT = '5000';

// For Android Emulator: 10.0.2.2 points to host machine's localhost
// For Physical device: Use your computer's IP address
const getBaseUrl = () => {
  // If using physical device or emulator with IP
  if (Platform.OS === 'android') {
    return `http://${YOUR_COMPUTER_IP}:${PORT}/api`;
  }
  // iOS simulator can use localhost or IP
  return `http://${YOUR_COMPUTER_IP}:${PORT}/api`;
};


const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ REQUEST INTERCEPTOR - Adds token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token added to request:', config.url);
      } else {
        console.log('⚠️ No token for request:', config.url);
      }
      return config;
    } catch (error) {
      console.error('Error adding token:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR - For debugging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
      console.error(`Make sure backend is running on ${YOUR_COMPUTER_IP}:${PORT}`);
    }
    return Promise.reject(error);
  }
);

// Audio analysis endpoint - MOVED AFTER api is defined
// services/api.js - Update the analyzeAudio function

export const analyzeAudio = async (audioBase64) => {
    try {
        console.log('🎤 Sending audio for analysis...');
        console.log('📊 Audio base64 length:', audioBase64.length);
        
        const response = await api.post('/analyze-audio', {
            audio_base64: audioBase64
        }, {
            timeout: 60000 // 60 second timeout for audio processing
        });
        
        console.log('✅ Audio analysis response:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Audio analysis failed:', error.message);
        
        // Retry up to 2 times on network errors
        if (retryCount < 2 && (error.message === 'Network Error' || error.code === 'ECONNABORTED')) {
            console.log(`🔄 Retrying... (${retryCount + 1}/2)`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return analyzeAudio(audioBase64, retryCount + 1);
        }
        
        if (error.response) {
            console.error('Server response:', error.response.data);
            return error.response.data;
        }
        
        if (error.code === 'ECONNABORTED') {
            return {
                error: 'Timeout',
                severity: 'error',
                asthma_probability: 0,
                confidence: 0,
                message: 'Analysis took too long. Please try a shorter recording (5-10 seconds).'
            };
        }
        
        return {
            error: 'Network error',
            severity: 'error',
            asthma_probability: 0,
            confidence: 0,
            message: 'Cannot connect to server. Please check your connection and ensure the backend is running.'
        };
    }
};
// ✅ IMPORTANT: Make sure you export the api instance (NOT an object with default)
export default api;