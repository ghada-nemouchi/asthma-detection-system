// App.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

// Import all screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import HistoryScreen from './screens/HistoryScreen';
import SymptomsLog from './screens/SymptomsLog';
import DoctorRequestScreen from './screens/DoctorRequestScreen';

const Stack = createStackNavigator();
let socket = null;

// Custom Header with Navigation Buttons
function CustomHeader({ navigation, route }) {
  const getTitle = () => {
    if (route.name === 'Home') return 'Dashboard';
    if (route.name === 'History') return 'Reading History';
    if (route.name === 'Profile') return 'My Profile';
    if (route.name === 'DoctorRequest') return 'Doctor Requests';
    return 'AsthmiCare';
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#547bfb',
      paddingTop: 48,
      paddingBottom: 12,
      paddingHorizontal: 16,
    }}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ padding: 8, alignItems: 'center' }}>
        <Ionicons name="home" size={24} color="#fff" />
        <Text style={{ fontSize: 10, color: '#fff', marginTop: 2 }}>Home</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
        {getTitle()}
      </Text>

      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity onPress={() => navigation.navigate('History')} style={{ padding: 8, marginRight: 8, alignItems: 'center' }}>
          <Ionicons name="time" size={24} color="#fff" />
          <Text style={{ fontSize: 10, color: '#fff', marginTop: 2 }}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 8, alignItems: 'center' }}>
          <Ionicons name="person" size={24} color="#fff" />
          <Text style={{ fontSize: 10, color: '#fff', marginTop: 2 }}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Socket Connection Component
function SocketManager({ navigation }) {
  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        
        console.log('🔌 Initializing socket...');
        console.log('Token exists:', !!token);
        
        if (token && userStr) {
          const user = JSON.parse(userStr);
          console.log('User role:', user.role);
          console.log('User ID:', user._id);
          
          if (user.role === 'patient') {
            // Connect to socket server - use your backend IP
            socket = io('http://10.39.163.152:5000');
            console.log('🔌 Socket connecting to http://10.39.163.152:5000');
            
            socket.on('connect', () => {
              console.log('✅ Socket connected!');
              socket.emit('join-patient-room', user._id);
              console.log('📡 Joined patient room:', user._id);
            });
            
            socket.on('doctor_request', (data) => {
              console.log('📨 Doctor request received:', data);
              Alert.alert(
                'Doctor Request',
                `Dr. ${data.doctorName} (${data.doctorSpecialty}) wants to be your doctor`,
                [
                  { text: 'Later', style: 'cancel' },
                  { text: 'View', onPress: () => navigation.navigate('DoctorRequest') }
                ]
              );
            });
            
            socket.on('connect_error', (error) => {
              console.log('❌ Socket connection error:', error.message);
            });
          }
        }
      } catch (error) {
        console.error('Socket init error:', error);
      }
    };
    
    initSocket();
    
    return () => {
      if (socket) {
        console.log('🔌 Disconnecting socket');
        socket.disconnect();
      }
    };
  }, [navigation]);
  
  return null;
}

// Main App Navigator
export default function App() {
  const navigationRef = useRef();

  return (
    <NavigationContainer ref={navigationRef}>
      <SocketManager navigation={navigationRef.current} />
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Create Account' }} 
        />
        <Stack.Screen 
          name="Home" 
          component={DashboardScreen} 
          options={({ navigation }) => ({
            header: () => <CustomHeader navigation={navigation} route={{ name: 'Home' }} />,
          })}
        />
        <Stack.Screen 
          name="History" 
          component={HistoryScreen} 
          options={({ navigation }) => ({
            header: () => <CustomHeader navigation={navigation} route={{ name: 'History' }} />,
          })}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={({ navigation }) => ({
            header: () => <CustomHeader navigation={navigation} route={{ name: 'Profile' }} />,
          })}
        />
        <Stack.Screen 
          name="DoctorRequest" 
          component={DoctorRequestScreen} 
          options={({ navigation }) => ({
            header: () => <CustomHeader navigation={navigation} route={{ name: 'DoctorRequest' }} />,
          })}
        />
        <Stack.Screen 
          name="SymptomsLog" 
          component={SymptomsLog} 
          options={{ 
            title: 'Log Symptoms',
            headerStyle: { backgroundColor: '#547bfb' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}