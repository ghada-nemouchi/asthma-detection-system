// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('token', token);
    console.log('✅ Token stored');
    return true;
  } catch (error) {
    console.error('❌ Error storing token:', error);
    return false;
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('token');
    return true;
  } catch (error) {
    console.error('❌ Error removing token:', error);
    return false;
  }
};

export const storeUser = async (user) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    console.log('✅ User stored');
    return true;
  } catch (error) {
    console.error('❌ Error storing user:', error);
    return false;
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      console.log('📖 User retrieved:', parsedUser.email);
      return parsedUser;
    }
    console.log('📖 No user found');
    return null;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem('user');
    return true;
  } catch (error) {
    console.error('❌ Error removing user:', error);
    return false;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(['token', 'user']);
    console.log('✅ All auth data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    return false;
  }
};