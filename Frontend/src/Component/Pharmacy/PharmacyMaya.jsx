import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronDown, Send, Sparkles, Loader2, Info, Layout, Share2, Package, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatbotApi } from '../../services/api';
import ReactMarkdown from 'react-markdown';

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

const PharmacyMaya = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm Maya, your Pharmacy Assistant. 👋 I'm here to help you master your Inventory, Orders, and Analysis. How can I assist you today?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const organizationId = user?.organizationId?._id || user?.organizationId;

  const handleQuickAction = (text) => {
    setInputValue(text);
    setShowQuickActions(false);
    setTimeout(() => {
      handleSend(null, text);
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
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const userContext = {
        name: user?.name,
        role: 'pharmacy'
      };

      const response = await chatbotApi.chat(currentInput, history, organizationId, userContext, 'pharmacy');
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: response.text, 
        sender: 'bot' 
      }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "I'm having trouble connecting to Slotify Intelligence. Please try again or contact support at **+91 9999999999**.", 
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
            className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-[350px] md:w-[380px] overflow-hidden border border-slate-100 flex flex-col h-[520px]"
          >
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h4 className="font-black text-lg leading-tight tracking-tight">Maya AI</h4>
                  <p className="text-indigo-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Pharmacy Expert
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-2 rounded-full transition-all active:scale-90"
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
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-semibold shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
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
                    onClick={() => handleQuickAction("How to use Broadcast?")}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Share2 size={14} /> Broadcast
                  </button>
                  <button 
                    onClick={() => handleQuickAction("What is Analysis?")}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Layout size={14} /> Analysis
                  </button>
                  <button 
                    onClick={() => handleQuickAction("How to add bulk Inventory?")}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Package size={14} /> Bulk Add
                  </button>
                  <button 
                    onClick={() => handleQuickAction("How to process Orders?")}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <ShoppingCart size={14} /> Orders
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
                    <span className="text-xs font-black uppercase tracking-widest">Maya is analyzing...</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSend} className="flex items-start gap-2 bg-slate-100 rounded-xl p-2 focus-within:ring-2 focus-within:ring-slate-900 transition-all">
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
                    placeholder="Ask about inventory, orders, analysis..."
                    className="flex-1 bg-transparent border-none px-2 py-2 text-sm outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 resize-none max-h-32 overflow-y-auto"
                  />
                  <button 
                    type="submit"
                    className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-lg active:scale-90 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Send size={18} />
                  </button>
                </form>
              <p className="text-[9px] text-center text-slate-400 mt-2 font-black uppercase tracking-[0.2em]">Equipped with Pharmacy OS 2.0</p>
            </div>
          </motion.div>
        ) : (
          <motion.div className="flex flex-col items-end gap-3">
             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white px-5 py-3 rounded-2xl shadow-xl border border-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2"
             >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                How can I assist?
             </motion.div>

             <div
               style={{
                 borderRadius: '50%',
                 padding: '3px',
                 background: 'conic-gradient(#1e293b, #475569, #cbd5e1, #1e293b)',
                 animation: 'maya-spin 4s linear infinite',
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
                   animation: 'maya-counter-spin 4s linear infinite',
                 }}
                 className="bg-slate-900"
               >
                 <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white">
                    <Sparkles size={28} />
                 </div>
               </motion.button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyMaya;
