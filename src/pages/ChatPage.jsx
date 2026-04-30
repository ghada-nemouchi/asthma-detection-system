// src/pages/ChatPage.jsx - FIXED

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { io } from 'socket.io-client';

export default function ChatPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const patientRes = await api.get(`/patients/${patientId}`);
        setPatient(patientRes.data);
        
        const meRes = await api.get('/auth/me');
        setDoctorId(meRes.data._id);
        
        const messagesRes = await api.get(`/messages/${patientId}`);
        setMessages(messagesRes.data.messages);
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Socket connection - ONLY for receiving messages from patient
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join-user-room', patientId);
    
    // ✅ FIXED: message.senderId is now a string, not an object
    socket.on('new_message', (message) => {
      console.log('📨 New message from socket:', message);
      // Only add if the message is from the patient (not from me)
      if (message.senderId === patientId) {  // ← CHANGED: removed ._id
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === message._id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const messageText = newMessage;
    setNewMessage('');
    
    try {
      const response = await api.post('/messages', {
        receiverId: patientId,
        message: messageText
      });
      
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-blue-500 text-white p-4 flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="hover:opacity-80">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold text-lg">{patient?.name}</h1>
          <p className="text-xs opacity-80">Patient</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => {
          // ✅ FIXED: senderId is now a string, not an object
          const isDoctor = msg.senderId === doctorId;  // ← CHANGED: removed ._id
          return (
            <div key={msg._id || idx} className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${
                isDoctor 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow'
              }`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${isDoctor ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-3 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition w-10 h-10 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}