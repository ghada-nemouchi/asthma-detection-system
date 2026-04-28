import * as SecureStore from 'expo-secure-store';

export const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync('token', token);
    console.log('✅ Token stored securely');
    return true;
  } catch (error) {
    console.error('❌ Error storing token:', error);
    return false;
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('token');
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync('token');
    console.log('✅ Token removed');
    return true;
  } catch (error) {
    console.error('❌ Error removing token:', error);
    return false;
  }
};

export const storeUser = async (user) => {
  try {
    // ✅ CRITICAL: Validate user has required fields
    if (!user || !user._id) {
      console.error('❌ CRITICAL ERROR: Attempting to store user without _id!');
      console.error('User object:', user);
      return false;
    }
    
    console.log('💾 Storing user with ID:', user._id);
    console.log('💾 User email:', user.email);
    console.log('💾 User name:', user.name);
    
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    console.log('✅ User stored securely');
    return true;
  } catch (error) {
    console.error('❌ Error storing user:', error);
    return false;
  }
};

export const getUser = async () => {
  try {
    const user = await SecureStore.getItemAsync('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      console.log('📖 Retrieved user from storage - ID:', parsedUser._id);
      console.log('📖 Retrieved user from storage - Email:', parsedUser.email);
      return parsedUser;
    }
    console.log('📖 No user found in storage');
    return null;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await SecureStore.deleteItemAsync('user');
    console.log('✅ User removed from storage');
    return true;
  } catch (error) {
    console.error('❌ Error removing user:', error);
    return false;
  }
};


// Clear all authentication data
export const clearAllData = async () => {
  try {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    console.log('✅ All auth data cleared from secure store');
    return true;
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
    return false;
  }
};