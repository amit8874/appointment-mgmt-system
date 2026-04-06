import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronDown, Send, Sparkles, Loader2, Info, UserPlus, CreditCard, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatbotApi, organizationApi } from '../../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { ChatActionOptions, DoctorChatCard } from '../Patient/components/ChatInteraction';

// Injected keyframe for rotating rainbow ring
const rainbowStyle = `
  @keyframes maya-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes maya-counter-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
  }
  .markdown-content p {
    margin-bottom: 0.5rem;
  }
  .markdown-content p:last-child {
    margin-bottom: 0;
  }
  .markdown-content strong {
    font-weight: 800;
  }
  .markdown-content ul, .markdown-content ol {
    margin-left: 1.25rem;
    margin-bottom: 0.5rem;
  }
  .markdown-content li {
    margin-bottom: 0.25rem;
  }
`;

const ChatBot = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey, my name is Maya! 👋 I'm here to help you revolutionize your clinic management. How can I assist you today?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [clinicInfo, setClinicInfo] = useState(null);

  // Get organizationId from user, URL, or localStorage
  const getOrganizationId = () => {
    const path = window.location.pathname;

    // 1. Explicit Clinic/Booking context in URL
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('orgId') || urlParams.get('organizationId');
    if (fromUrl) return fromUrl;

    const pathParts = path.split('/');
    if ((pathParts[1] === 'clinic' || pathParts[1] === 'booking') && pathParts[2]) return pathParts[2];

    // 2. Dashboard context (for Clinic Owners/Staff)
    if (path.startsWith('/dashboard') || path.startsWith('/organization')) {
      if (user?.organizationId?._id) return user.organizationId._id;
      if (user?.organizationId) return user.organizationId;
      return localStorage.getItem('organizationId');
    }

    // 3. Default to NULL for Maya Global Search (Home, Search Results, etc.)
    return null;
  };

  const organizationId = getOrganizationId();

  useEffect(() => {
    console.log(`[ChatBot] Detected OrganizationID: ${organizationId}`);
    const fetchClinicInfo = async () => {
      if (organizationId) {
        try {
          const data = await organizationApi.getById(organizationId);
          setClinicInfo(data);
        } catch (error) {
          console.error("Error fetching clinic info:", error);
        }
      }
    };
    fetchClinicInfo();

    // Auto-popup after 2.5 seconds if not shown this load
    const hasShown = sessionStorage.getItem('hasShownChatBot');
    if (!hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('hasShownChatBot', 'true');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleQuickAction = (text) => {
    setInputValue(text);
    setShowQuickActions(false);

    // Use a small delay to ensure state updates before submitting
    setTimeout(() => {
      const form = document.getElementById('chatbot-form');
      if (form) {
        const fakeEvent = { preventDefault: () => { } };
        handleSend(fakeEvent, text);
      }
    }, 100);
  };

  const handleSend = async (e, overrideValue = null) => {
    if (e) e.preventDefault();
    const currentInput = overrideValue || inputValue;
    if (!currentInput.trim() || isLoading) return;

    const userMsg = { id: Date.now(), text: currentInput, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare history for model
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Prepare user context for better responses
      const userContext = isAuthenticated ? {
        name: user?.name || user?.firstName,
        role: user?.role,
        phone: user?.mobile || user?.phone
      } : null;

      const response = await chatbotApi.chat(currentInput, history, organizationId, userContext);

      const botText = response.text;

      const displayTemplate = botText.trim();

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: displayTemplate,
        sender: 'bot',
        messageType: response.messageType || 'text',
        metadata: response.metadata || null
      }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I'm having a little trouble connecting right now. Could you please try again?",
        sender: 'bot'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      <style>{rainbowStyle}</style>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-[350px] md:w-[380px] overflow-hidden border border-slate-100 flex flex-col h-[600px]"
          >
            {/* Header */}
            <div className="bg-[#00386a] p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <img
                    src="/assets/chatbot/maya.png"
                    alt="Maya"
                    className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h4 className="font-black text-lg leading-tight tracking-tight">Maya AI</h4>
                  <p className="text-blue-200 text-xs font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Online Buddy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-2 rounded-full transition-all active:scale-90"
                title="Slide Down"
              >
                <ChevronDown size={24} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/80">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-semibold shadow-sm ${msg.sender === 'user'
                      ? 'bg-[#00386a] text-white rounded-tr-none'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* Interactive UI */}
                    {msg.sender === 'bot' && msg.messageType === 'options' && msg.metadata?.options && (
                      <ChatActionOptions
                        options={msg.metadata.options}
                        onSelect={(val) => handleSend(null, val)}
                      />
                    )}

                    {msg.sender === 'bot' && msg.messageType === 'doctor_list' && msg.metadata?.doctors && (
                      <div className="flex flex-col gap-4 mt-2">
                        {msg.metadata.doctors.map((doc, dIdx) => (
                          <DoctorChatCard key={dIdx} doctor={doc} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {showQuickActions && messages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 pt-2 px-2"
                >
                  <button
                    onClick={() => handleQuickAction("Book a doctor appointment")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg shadow-blue-200 flex items-center gap-2 border border-blue-500 hover:bg-blue-700 transition-all"
                  >
                    <Calendar size={14} className="fill-white" />
                    Book Appointment
                  </button>
                  <button
                    onClick={() => handleQuickAction("What are the features of Slotify?")}
                    className="bg-white border border-blue-200 text-[#00386a] px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Info size={14} />
                    Explore Features
                  </button>
                  <button
                    onClick={() => handleQuickAction("Tell me about the pricing plans.")}
                    className="bg-white border border-blue-200 text-[#00386a] px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <CreditCard size={14} />
                    Pricing Plans
                  </button>
                  <button
                    onClick={() => handleQuickAction("How can I register my clinic?")}
                    className="bg-white border border-blue-200 text-[#00386a] px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <UserPlus size={14} />
                    How to Register?
                  </button>
                </motion.div>
              )}


              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white text-slate-400 p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold">Maya is typing...</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <form id="chatbot-form" onSubmit={handleSend} className="flex items-start gap-2 bg-slate-100 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <textarea
                  rows="1"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                      e.target.style.height = 'auto';
                    }
                  }}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 resize-none max-h-32 overflow-y-auto"
                />
                <button
                  type="submit"
                  className="bg-[#00386a] text-white p-2.5 rounded-lg hover:bg-[#002b52] transition-all shadow-lg active:scale-90 flex items-center justify-center shrink-0 mt-0.5"
                >
                  <Send size={18} />
                </button>
              </form>
              <div className="mt-2 text-center space-y-1.5">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Powered by Slotify AI</p>
                <p className="text-[9px] text-slate-400/70 font-bold leading-none">Maya can make mistakes. Check important info</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col items-end gap-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white px-5 py-3 rounded-2xl shadow-xl border border-slate-100 text-slate-700 text-sm font-bold flex items-center gap-2 mb-2"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              How can I help you?
            </motion.div>

            {/* Rotating rainbow ring wrapper */}
            <div
              style={{
                borderRadius: '50%',
                padding: '3px',
                background: 'conic-gradient(#b30000, #bf5e00, #8a8a00, #005200, #00008b, #1a006b, #4b0082, #b30000)',
                animation: 'maya-spin 2.5s linear infinite',
              }}
            >
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpen(true)}
                style={{
                  display: 'block',
                  borderRadius: '50%',
                  border: '2px solid white',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                  animation: 'maya-counter-spin 2.5s linear infinite',
                }}
              >
                <img
                  src="/assets/chatbot/maya.png"
                  alt="Chat"
                  className="w-16 h-16 object-cover"
                />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBot;
