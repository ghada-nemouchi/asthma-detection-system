// services/api.js - COMPLETE VERSION (no expo-network, but keeps all functionality)
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Cache for server IP
let cachedServerIp = null;

// Your computer's known IP (from ipconfig)
const DEFAULT_SERVER_IP = '192.168.100.15';
const PYTHON_PORT = '5001';
const NODE_PORT = '5000';

// Function to auto-detect server IP (without expo-network)
export const detectServerIp = async () => {
    try {
        // Common server IPs to try (your computer's likely IP)
        const possibleIps = [
            DEFAULT_SERVER_IP,      // Your computer's IP
            '192.168.1.15',
            '192.168.0.15',
            '10.0.0.15',
            '192.168.100.1',        // Router
            '192.168.1.1',
            '192.168.0.1',
        ];
        
        console.log('🔍 Scanning for server at:', possibleIps);
        
        // Try to find which IP has the backend
        for (const testIp of possibleIps) {
            try {
                // Test health endpoint on port 5001 (Python backend)
                const testUrl = `http://${testIp}:${PYTHON_PORT}/health`;
                console.log(`Testing: ${testUrl}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                
                const response = await fetch(testUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log(`✅ Found backend at: ${testIp}:${PYTHON_PORT}`);
                    cachedServerIp = testIp;
                    return testIp;
                }
            } catch (e) {
                // Continue trying
            }
        }
        
        // If auto-detection fails, return default
        console.log('⚠️ Auto-detection failed, using default IP:', DEFAULT_SERVER_IP);
        cachedServerIp = DEFAULT_SERVER_IP;
        return DEFAULT_SERVER_IP;
        
    } catch (error) {
        console.error('❌ IP detection failed:', error);
        cachedServerIp = DEFAULT_SERVER_IP;
        return DEFAULT_SERVER_IP;
    }
};

// Get base URL for Node.js API (port 5000) - for auth, patients, etc.
export const getNodeBaseUrl = () => {
    const ip = cachedServerIp || DEFAULT_SERVER_IP;
    
    // For Android emulator, localhost doesn't work, need actual IP
    if (Platform.OS === 'android' && ip === 'localhost') {
        return `http://${DEFAULT_SERVER_IP}:${NODE_PORT}/api`;
    }
    return `http://${ip}:${NODE_PORT}/api`;
};

// Get base URL for Python AI service (port 5001) - for audio analysis
export const getPythonBaseUrl = () => {
    const ip = cachedServerIp || DEFAULT_SERVER_IP;
    return `http://${ip}:${PYTHON_PORT}`;
};

// Initialize server IP on app start
export const initServerIp = async () => {
    const ip = await detectServerIp();
    cachedServerIp = ip;
    console.log('✅ Server IP set to:', cachedServerIp);
    return ip;
};

// Create axios instance for Node.js backend (port 5000)
const api = axios.create({
  baseURL: getNodeBaseUrl(),
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
      console.error('No response from server');
      console.error(`Make sure backend is running on ${cachedServerIp || DEFAULT_SERVER_IP}:${NODE_PORT}`);
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUDIO ANALYSIS FUNCTION (Direct to Python backend)
// ============================================

export const analyzeAudio = async (audioBase64, retryCount = 0) => {
    try {
        // Ensure server IP is detected
        if (!cachedServerIp) {
            await initServerIp();
        }
        
        const pythonUrl = getPythonBaseUrl();
        const url = `${pythonUrl}/predict-asthma-audio`;
        
        console.log('🎤 Sending audio for analysis...');
        console.log('📡 To:', url);
        console.log('📊 Audio base64 length:', audioBase64.length);
        
        // Use fetch directly (not axios) for better timeout control
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audio_base64: audioBase64
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Audio analysis result:', data);
        
        // Check for errors in response
        if (data.error) {
            console.error('❌ Backend error:', data.message);
            return {
                asthma_probability: 0,
                severity: 'error',
                message: data.message || 'Analysis failed',
                error: true
            };
        }
        
        return data;
        
    } catch (error) {
        console.error(`❌ Audio analysis failed (attempt ${retryCount + 1}):`, error.message);
        
        // Retry up to 2 times on network errors
        if (retryCount < 2 && (error.name === 'AbortError' || error.message === 'Network request failed')) {
            console.log(`🔄 Retrying... (${retryCount + 1}/2)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return analyzeAudio(audioBase64, retryCount + 1);
        }
        
        // Check if server is reachable
        if (cachedServerIp) {
            try {
                const healthCheck = await fetch(`http://${cachedServerIp}:${PYTHON_PORT}/health`);
                if (!healthCheck.ok) {
                    console.error('❌ Python backend health check failed');
                }
            } catch (healthError) {
                console.error('❌ Python backend not reachable at:', `http://${cachedServerIp}:${PYTHON_PORT}`);
            }
        }
        
        return {
            asthma_probability: 0,
            severity: 'error',
            message: error.name === 'AbortError' 
                ? 'Analysis timeout. Please try a shorter recording (5-10 seconds).'
                : `Cannot connect to server. Make sure backend is running on ${cachedServerIp || DEFAULT_SERVER_IP}:${PYTHON_PORT}`,
            error: true,
            confidence: 0
        };
    }
};

// ============================================
// HEALTH CHECK FUNCTIONS
// ============================================

export const checkPythonBackendHealth = async () => {
    if (!cachedServerIp) {
        await initServerIp();
    }
    
    try {
        const url = `http://${cachedServerIp}:${PYTHON_PORT}/health`;
        console.log('🏥 Checking Python backend:', url);
        const response = await fetch(url, { method: 'GET' });
        return response.ok;
    } catch (error) {
        console.error('Python backend health check failed:', error);
        return false;
    }
};

export const checkNodeBackendHealth = async () => {
    try {
        const response = await api.get('/health');
        return response.status === 200;
    } catch (error) {
        console.error('Node backend health check failed:', error);
        return false;
    }
};

// Export the api instance for Node.js backend calls
export default api;