// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your computer's IP address from the network / mobile cnx 10.39.163.152 , fibre cnx 192.168.100.15,
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

// ✅ IMPORTANT: Make sure you export the api instance (NOT an object with default)
export default api;