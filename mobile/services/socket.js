import { io } from 'socket.io-client';
import { getToken, getUser } from '../utils/storage';

let socket = null;

export const initializeSocket = async () => {
  try {
    const token = await getToken();
    const user = await getUser();
    
    if (!token || !user) {
      console.log('⚠️ No token/user, skipping socket connection');
      return null;
    }
    
    // Disconnect existing socket if any
    if (socket) {
      console.log('🔌 Disconnecting existing socket...');
      socket.disconnect();
      socket = null;
    }
    
    // Use your network IP from backend logs
    const SOCKET_URL = 'http://192.168.100.15:5000';
    console.log('🔌 Initializing socket connection to:', SOCKET_URL);
    console.log('👤 User ID:', user._id);
    console.log('👤 User role:', user.role);
    
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully! ID:', socket.id);
      
      // Join appropriate room based on role
      if (user.role === 'patient') {
        socket.emit('join-patient-room', user._id);
        console.log('📡 Patient joined room:', user._id);
      } else if (user.role === 'doctor') {
        socket.emit('join-doctors-room');
        console.log('📡 Doctor joined doctors room');
      }
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
    
    return socket;
  } catch (error) {
    console.error('❌ Socket initialization error:', error);
    return null;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Manually disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;