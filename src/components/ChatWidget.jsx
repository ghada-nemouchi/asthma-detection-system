import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import api from '../services/api';

const ChatWidget = ({ patientId, patientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Load messages
  const loadMessages = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const response = await api.get(`/messages/${patientId}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Socket connection
  useEffect(() => {
    if (!patientId || !isOpen) return;

    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.emit('join-user-room', patientId);

    // ✅ FIXED: senderId is now a string, not an object
    socket.on('new_message', (message) => {
      // Only add if message is from patient (not from doctor)
      if (message.senderId === patientId) {
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === message._id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
        // Mark as read
        api.put(`/messages/read/${message.senderId}`);
      }
    });

    loadMessages();

    return () => {
      socket.disconnect();
    };
  }, [patientId, isOpen]);

  // Auto scroll
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

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all z-50"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 w-80 z-50">
        <div className="flex items-center justify-between p-3 bg-blue-500 text-white rounded-t-xl">
          <span className="font-semibold">💬 Chat with {patientName}</span>
          <div className="flex gap-2">
            <button onClick={() => setIsMinimized(false)} className="hover:opacity-80">
              <Maximize2 size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-3 text-center text-gray-500 text-sm">
          Chat minimized. Click to expand.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-blue-500 text-white rounded-t-xl">
        <div>
          <span className="font-semibold">💬 {patientName}</span>
          <span className="text-xs ml-2 opacity-80">Patient</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsMinimized(true)} className="hover:opacity-80">
            <Minimize2 size={16} />
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="text-center text-gray-400">Loading...</div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 mt-10">
            No messages yet. Start the conversation!
          </div>
        )}
        
        {/* ✅ FIXED: Message rendering */}
        {messages.map((msg, idx) => {
          // Get current user from localStorage
          const currentUser = JSON.parse(localStorage.getItem('user'));
          // ✅ senderId is now a string, not an object with ._id
          const isDoctor = msg.senderId === currentUser?._id;
          
          return (
            <div
              key={msg._id || idx}
              className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-2 rounded-lg ${
                  isDoctor
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${isDoctor ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;