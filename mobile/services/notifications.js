import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';  // ← Only ONE import, remove the duplicate

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Push notifications require a physical device');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  
  // Send token to backend
  const user = await AsyncStorage.getItem('user');
  if (user) {
    const { _id } = JSON.parse(user);
    await api.put(`/patients/${_id}/fcm`, { fcmToken: token.data });
  }
  
  return token.data;
}