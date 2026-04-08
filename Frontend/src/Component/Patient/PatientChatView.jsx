import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  MessageSquare, 
  Loader2,
  Info,
  ChevronLeft,
  Activity,
  Heart,
  HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { messageApi, getSocketUrl } from '../../services/api';
import { ChatActionOptions, DoctorChatCard } from './components/ChatInteraction';

const PatientChatView = () => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExplaining, setIsExplaining] = useState(null); // ID of message being explained
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    const socketUrl = getSocketUrl();
    
    socketRef.current = io(socketUrl);

    const socket = socketRef.current;
    
    socket.on('connect', () => {
      console.log('Patient connected to socket');
      const patientId = user?._id || user?.id;
      if (patientId) {
        const patientRoom = `patient_${patientId}`;
        socket.emit('join-tenant', patientRoom); 
      }
    });

    socket.on('new-chat-message', (data) => {
      const { conversation: updatedConvo, message } = data;
      setConversation(updatedConvo);
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      
      // Reset unread counts on server since we are viewing
      messageApi.getMessages(updatedConvo._id, 'patient');
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch initial data
  useEffect(() => {
    const initChat = async () => {
      const patientId = user?._id || user?.id;
      const orgId = user?.organizationId || user?.organization?._id || user?.organization || user?.tenantId;

      if (!patientId || !orgId) {
        console.warn('Patient chat: Missing patientId or organizationId', { patientId, orgId });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Get Conversation
        const convo = await messageApi.getPatientConversation(patientId, orgId);
        
        if (convo) {
          setConversation(convo);
          // 2. Get Messages
          const msgs = await messageApi.getMessages(convo._id, 'patient');
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      } finally {
        setLoading(false);
      }
    };
    initChat();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e, forcedText = null) => {
    if (e) e.preventDefault();
    const messageText = forcedText || newMessage;
    if (!messageText.trim()) return;

    try {
      const patientId = user?.patientProfileId || user?._id || user?.id;
      const orgId = user?.organizationId || user?.organization?._id || user?.organization || user?.tenantId;

      const msgData = {
        patientId,
        organizationId: orgId,
        conversationId: conversation?._id,
        sender: 'patient',
        senderName: `${user.firstName || user.name || 'Patient'} ${user.lastName || ''}`,
        text: messageText
      };
      
      const res = await messageApi.sendMessage(msgData);
      if (!conversation) setConversation(res.conversation);
      setMessages(prev => [...prev, res.message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleExplain = async (msg) => {
    try {
      setIsExplaining(msg._id);
      const res = await messageApi.explainWithMaya({
        conversationId: conversation._id,
        messageText: msg.text,
        patientName: user.firstName
      });
      // Message list is updated via Socket.io automatically, 
      // but we add it manually for responsiveness if socket is slow
      if (!messages.find(m => m._id === res.message._id)) {
        setMessages(prev => [...prev, res.message]);
      }
    } catch (err) {
      console.error('Maya explaining error:', err);
    } finally {
      setIsExplaining(null);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 overflow-hidden border border-slate-100">
      
      {/* Chat Header */}
      <div className="p-6 bg-white border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <HeartPulse size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Clinic Support</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Directly connected to Dr. {conversation?.lastDoctorName || 'Staff'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
          <Sparkles size={16} className="text-indigo-500" />
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
            AI Interpreter Enabled
          </p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
              <MessageSquare size={32} className="text-blue-200" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">How can we help you?</h3>
            <p className="text-sm text-slate-500 font-medium max-w-xs mt-2">
              Send a message to your doctor or our clinical staff. We're here to assist you with your health.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={msg._id || idx} 
              className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] ${msg.sender === 'patient' ? 'text-right' : 'text-left'}`}>
                {/* Meta Name */}
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-2">
                   {msg.sender === 'patient' ? 'You' : msg.sender === 'clinic' ? 'Doctor / Clinic' : 'Maya AI'}
                </p>

                <div className={`p-4 rounded-3xl text-sm font-medium leading-relaxed inline-block group relative ${
                  msg.sender === 'patient' 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' 
                    : msg.sender === 'maya_ai'
                    ? 'bg-white border-2 border-indigo-100 text-slate-700 rounded-tl-none italic bg-gradient-to-br from-indigo-50/50 to-white'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                }`}>
                  {msg.text}

                  {/* Render Options if any */}
                  {msg.messageType === 'options' && msg.metadata?.options && (
                    <ChatActionOptions 
                      options={msg.metadata.options} 
                      onSelect={(val) => handleSendMessage(null, val)} 
                    />
                  )}

                  {/* Render Doctor List if any */}
                  {msg.messageType === 'doctor_list' && msg.metadata?.doctors && (
                    <div className="flex flex-col gap-4 mt-2">
                      {msg.metadata.doctors.map((doc, dIdx) => (
                        <DoctorChatCard key={dIdx} doctor={doc} />
                      ))}
                    </div>
                  )}

                  {/* Explain Button - ONLY for clinic messages */}
                  {msg.sender === 'clinic' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleExplain(msg)}
                      className="absolute -right-12 top-0 p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex flex-col items-center gap-1 group-hover:opacity-100 opacity-0 sm:opacity-40"
                      title="Ask Maya to explain this simply"
                      disabled={isExplaining === msg._id}
                    >
                      {isExplaining === msg._id ? (
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      <span className="text-[8px] font-black uppercase">Explain</span>
                    </motion.button>
                  )}
                </div>

                <p className={`mt-1.5 px-2 text-[10px] font-bold text-slate-400 ${msg.sender === 'patient' ? 'text-right' : 'text-left'}`}>
                  {format(new Date(msg.createdAt), 'p')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <div className="flex-1 relative group">
            <input 
              type="text"
              placeholder="Type your question or doubt here..."
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-medium focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Enter to send</span>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-slate-900 text-white p-5 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[64px]"
          >
            <Send size={24} />
          </button>
        </form>
        <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest flex items-center justify-center gap-2">
           <Info size={12} className="text-blue-500" />
           Your messages are confidential and encrypted. 
        </p>
      </div>
    </div>
  );
};

export default PatientChatView;
