import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initializeSocket } from '../services/socket';
import api from '../services/api';
import { getUser } from '../utils/storage';

export default function ChatScreen({ route, navigation }) {
  const { doctorId, doctorName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const flatListRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      setMyId(user._id);
      
      if (doctorId) {
        const response = await api.get(`/messages/${doctorId}`);
        setMessages(response.data.messages);
      }
      setLoading(false);
    };
    init();

    const setupSocket = async () => {
      try {
        const socket = await initializeSocket();
        
        if (socket) {
          socketRef.current = socket;
          
          // Listen for messages from doctor
          socket.on('new_message', (message) => {
            // Only add if message is from doctor
            if (message.senderId === doctorId) {
              setMessages(prev => {
                const exists = prev.some(msg => msg._id === message._id);
                if (!exists) {
                  return [...prev, message];
                }
                return prev;
              });
            }
          });
        }
      } catch (error) {
        console.error('Error setting up socket:', error);
      }
    };
    
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message');
      }
    };
  }, [doctorId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !doctorId) return;
    
    setSending(true);
    const messageText = newMessage;
    setNewMessage('');
    
    try {
      const response = await api.post('/messages', {
        receiverId: doctorId,
        message: messageText
      });
      
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // ✅ SIMPLE FIX - Direct comparison
  const renderMessage = ({ item }) => {
    const isMe = item.senderId === myId;
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.myTime : styles.otherTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#547bfb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {doctorName || 'Doctor'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity 
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={sending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#547bfb',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backBtn: { padding: 4 },
  messagesList: { padding: 16, paddingBottom: 20 },
  messageRow: { marginBottom: 12 },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 10, borderRadius: 18 },
  myBubble: { backgroundColor: '#547bfb', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  messageText: { fontSize: 14 },
  myText: { color: '#fff' },
  otherText: { color: '#1f2937' },
  messageTime: { fontSize: 10, marginTop: 4 },
  myTime: { color: '#c7d2fe', textAlign: 'right' },
  otherTime: { color: '#9ca3af' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#547bfb', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});