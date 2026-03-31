import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  User, 
  Eye, 
  MoreVertical, 
  Info, 
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  X,
  Phone,
  Calendar,
  Activity,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { messageApi } from '../../../services/api';

const MessagesView = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.io
  useEffect(() => {
    let socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace('/api', '');
    }
    
    socketRef.current = io(socketUrl);
    
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      console.log('Connected to socket server');
      if (user?.organizationId) {
        socket.emit('join-tenant', user.organizationId);
      }
    });

    socket.on('new-chat-message', (data) => {
      const { conversation, message } = data;
      
      setConversations(prev => {
        const index = prev.findIndex(c => c._id === conversation._id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...conversation, patientId: prev[index].patientId };
          return [updated[index], ...updated.filter((_, i) => i !== index)];
        } else {
          return [conversation, ...prev];
        }
      });

      if (activeConvo?._id === conversation._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        // Reset unread count since we are viewing it
        messageApi.getMessages(conversation._id, 'clinic');
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user, activeConvo]);

  // Initial load: Fetch conversations
  useEffect(() => {
    const fetchConvos = async () => {
      try {
        setLoading(true);
        const data = await messageApi.getConversations();
        setConversations(data);
        if (data.length > 0) {
          setActiveConvo(data[0]);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConvos();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConvo) {
      const fetchMsgs = async () => {
        try {
          setMessagesLoading(true);
          const data = await messageApi.getMessages(activeConvo._id, 'clinic');
          setMessages(data);
          
          // Reset unread counts locally
          setConversations(prev => prev.map(c => 
            c._id === activeConvo._id ? { ...c, unreadCountClinic: 0 } : c
          ));
        } catch (err) {
          console.error('Error fetching messages:', err);
        } finally {
          setMessagesLoading(false);
        }
      };
      fetchMsgs();
    }
  }, [activeConvo?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo) return;

    try {
      const msgData = {
        conversationId: activeConvo._id,
        sender: 'clinic',
        senderName: `Dr. ${user.name || 'Provider'}`, // Shown as "Doctor / Clinic" to patient
        text: newMessage
      };
      
      const res = await messageApi.sendMessage(msgData);
      setMessages(prev => [...prev, res.message]);
      setNewMessage('');
      
      // Update convo list last message
      setConversations(prev => prev.map(c => 
        c._id === activeConvo._id ? { ...c, lastMessage: newMessage, lastMessageAt: new Date() } : c
      ));
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const filteredConvos = conversations.filter(c => {
    const firstName = c.patientId?.firstName || '';
    const lastName = c.patientId?.lastName || '';
    const name = `${firstName} ${lastName}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex">
      {/* Sidebar - Conversation List */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-xl font-black text-slate-800 mb-4 tracking-tight">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConvos.length > 0 ? (
            filteredConvos.map((convo) => (
              <button
                key={convo._id}
                onClick={() => setActiveConvo(convo)}
                className={`w-full p-4 flex items-center gap-4 transition-all border-b border-slate-50 relative ${
                  activeConvo?._id === convo._id ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                }`}
              >
                {activeConvo?._id === convo._id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                )}
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-bold shadow-sm border border-slate-100 uppercase">
                  {convo.patientId?.firstName?.[0] || convo.patientId?.[0] || '?'}{convo.patientId?.lastName?.[0] || ''}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {convo.patientId?.firstName || 'Unknown'} {convo.patientId?.lastName || 'Patient'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {format(new Date(convo.lastMessageAt), 'p')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate font-medium">
                      {convo.lastMessage}
                    </p>
                    {convo.unreadCountClinic > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {convo.unreadCountClinic}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <MessageSquare size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-bold">No active conversations found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col bg-slate-50/30">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs uppercase border border-indigo-100">
                {activeConvo.patientId?.firstName?.[0]}{activeConvo.patientId?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-sm truncate">
                  {activeConvo.patientId?.firstName || 'Unknown'} {activeConvo.patientId?.lastName || 'Patient'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  ID: {activeConvo.patientId?.patientId || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPatientInfo(true)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="View Patient Details"
              >
                <Eye size={20} />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messagesLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : (
              messages
                .filter(m => m.sender !== 'maya_ai')
                .map((msg, idx) => (
                <div 
                  key={msg._id || idx} 
                  className={`flex ${msg.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] group ${msg.sender === 'clinic' ? 'text-right' : 'text-left'}`}>
                    {msg.sender === 'maya_ai' && (
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                          <Activity size={10} />
                          Maya Medical Interpretation
                        </span>
                      </div>
                    )}
                    <div className={`p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed inline-block ${
                      msg.sender === 'clinic' 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : msg.sender === 'maya_ai'
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tl-none italic'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 px-1 text-[10px] font-bold text-slate-400 ${msg.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                      {format(new Date(msg.createdAt), 'p')}
                      {msg.sender === 'clinic' && (
                        <CheckCheck size={12} className={msg.read ? "text-blue-500" : "text-slate-300"} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t border-slate-50">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input 
                type="text"
                placeholder="Type your message to patient..."
                className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
            <MessageSquare size={32} className="text-blue-200" />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Your Messages</h3>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Select a conversation to start chatting</p>
        </div>
      )}

      {/* Patient Info Sidebar Component / Modal */}
      {showPatientInfo && activeConvo && (
        <div className="fixed inset-0 z-[1002] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-900 font-black text-2xl border border-slate-100">
                  {activeConvo.patientId?.firstName?.[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {activeConvo.patientId?.firstName || 'Unknown'} {activeConvo.patientId?.lastName || ''}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Patient Profile
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPatientInfo(false)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 pt-4 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient ID</p>
                  <p className="text-sm font-black text-slate-700">{activeConvo.patientId?.patientId || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                  <p className="text-sm font-black text-slate-700">{activeConvo.patientId?.mobile || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Age / Gender</p>
                  <p className="text-sm font-black text-slate-700">{activeConvo.patientId?.age}Y • {activeConvo.patientId?.gender}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Blood Group</p>
                    <p className="text-sm font-black text-rose-600">{activeConvo.patientId?.bloodGroup || 'O+'}</p>
                  </div>
                  <Heart size={20} className="text-rose-500 fill-rose-50 opacity-20" />
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-blue-500 rounded-full" />
                  Communication Context
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <User size={18} className="text-blue-600" />
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Assigned Doctor</p>
                      <p className="text-sm font-bold text-slate-700">{activeConvo.lastDoctorName || 'Dr. Not Assigned'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 border-t border-slate-50 mt-4">
              <button 
                onClick={() => setShowPatientInfo(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesView;
