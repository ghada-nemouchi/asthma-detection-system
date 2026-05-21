import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Bot, Loader2, Sparkles, BookOpen, 
  ChevronRight, MessageSquare, Copy, CheckCheck 
} from 'lucide-react';
import api from '../services/api';

const GuidelinesChatModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load suggested questions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSuggestedQuestions();
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSuggestedQuestions = async () => {
    try {
      const response = await api.get('/guidelines/suggested-questions');
      setSuggestedQuestions(response.data.suggestedQuestions);
    } catch (error) {
      console.error('Failed to fetch suggested questions:', error);
    }
  };

  const sendMessage = async (question) => {
    const userQuestion = question || input.trim();
    if (!userQuestion || isLoading) return;

    // Add user message
    const userMessage = { role: 'user', content: userQuestion, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add temporary loading message
    const loadingMessage = { role: 'assistant', content: '...', isLoading: true };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await api.post('/guidelines/query', { question: userQuestion });
      
      // Replace loading message with actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date(),
          sources: response.data.sources,
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error sending question:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          isError: true,
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, index) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatAnswer = (text) => {
    // Bold text between ** **
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert line breaks to <br/>
    formatted = formatted.replace(/\n/g, '<br/>');
    // Convert numbered lists
    formatted = formatted.replace(/(\d+)\.\s/g, '<br/><strong>$1.</strong> ');
    return formatted;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">GINA 2025 Clinical Assistant</h3>
              <p className="text-xs text-blue-100">Powered by RAG • Official Guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={40} className="text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                GINA 2025 Guidelines Q&A
              </h4>
              <p className="text-gray-500 max-w-md mb-6">
                Ask me anything about asthma diagnosis, treatment, management, 
                or the latest updates from the GINA 2025 strategy report.
              </p>
              
              {/* Suggested Questions */}
              <div className="w-full max-w-lg">
                <p className="text-sm font-medium text-gray-600 mb-3 text-left">
                  Suggested questions:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.slice(0, 5).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-blue-700">
                        {q}
                      </span>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md shadow-sm'
                  } p-4`}
                >
                  {msg.role === 'assistant' && !msg.isLoading && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Bot size={14} />
                      <span>GINA Assistant</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                  
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Searching GINA guidelines...</span>
                    </div>
                  ) : (
                    <>
                      <div 
                        className={`prose prose-sm max-w-none ${
                          msg.role === 'user' ? 'text-white' : 'text-gray-700'
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: msg.role === 'assistant' 
                            ? formatAnswer(msg.content)
                            : msg.content
                        }}
                      />
                      
                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <BookOpen size={10} />
                            Sources: GINA 2025 Strategy Report
                          </p>
                        </div>
                      )}
                      
                      {msg.role === 'assistant' && !msg.isError && (
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="mt-2 text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          {copiedIndex === idx ? (
                            <><CheckCheck size={12} /> Copied</>
                          ) : (
                            <><Copy size={12} /> Copy</>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about GINA guidelines (e.g., 'What's new in Step 3 therapy for adults?')"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                <MessageSquare size={16} />
              </div>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            This AI assistant provides answers based on the GINA 2025 Global Strategy Report. 
            Always verify with official guidelines and use clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesChatModal;