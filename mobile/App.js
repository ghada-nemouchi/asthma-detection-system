// App.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initializeSocket, disconnectSocket } from './services/socket';
import { getUser } from './utils/storage';
import { registerForPushNotificationsAsync } from './services/notifications';

// Import all screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import HistoryScreen from './screens/HistoryScreen';
import SymptomsLog from './screens/SymptomsLog';
import DoctorRequestScreen from './screens/DoctorRequestScreen';
import PersonalBestScreen from './screens/PersonalBestScreen';
import EmergencyContactsScreen from './screens/EmergencyContactsScreen';

const Stack = createStackNavigator();

// Custom Header with Navigation Buttons
function CustomHeader({ navigation, route }) {
  const getTitle = () => {
    if (route.name === 'Home') return 'Dashboard';
    if (route.name === 'History') return 'Reading History';
    if (route.name === 'Profile') return 'My Profile';
    if (route.name === 'DoctorRequest') return 'Doctor Requests';
    if (route.name === 'PersonalBest') return 'Personal Best PEF';
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

// Socket Manager Component
function SocketManager({ navigation }) {
  useEffect(() => {
    const setupSocket = async () => {
      await registerForPushNotificationsAsync();
      const user = await getUser();
      if (user) {
        const socket = await initializeSocket();
        
        if (socket && user.role === 'patient') {
          socket.on('doctor_request', (data) => {
            console.log('📨 Doctor request received:', data);
            Alert.alert(
              'Doctor Request',
              `Dr. ${data.doctorName} (${data.doctorSpecialty}) wants to be your doctor`,
              [
                { text: 'Later', style: 'cancel' },
                { text: 'View', onPress: () => navigation?.navigate('DoctorRequest') }
              ]
            );
          });
        }
      }
    };
    
    setupSocket();
    
    return () => {
      disconnectSocket();
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
        <Stack.Screen 
          name="PersonalBest" 
          component={PersonalBestScreen} 
          options={({ navigation }) => ({
            header: () => <CustomHeader navigation={navigation} route={{ name: 'PersonalBest' }} />,
          })}
        />
        <Stack.Screen 
          name="EmergencyContacts" 
          component={EmergencyContactsScreen} 
          options={{ title: 'Emergency Contacts' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}