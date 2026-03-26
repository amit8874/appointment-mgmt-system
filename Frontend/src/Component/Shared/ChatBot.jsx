import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronDown, Send, Sparkles, Loader2 } from 'lucide-react';
import { chatbotApi } from '../../services/api';

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
`;

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey, my name is Maya! 👋 I'm here to help you revolutionize your clinic management. How can I assist you today?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare history for Gemini (simplified for now)
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await chatbotApi.chat(inputValue, history);
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: response.text, 
        sender: 'bot' 
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
            className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-[350px] md:w-[380px] overflow-hidden border border-slate-100 flex flex-col h-[520px]"
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
                  <h4 className="font-black text-lg leading-tight tracking-tight">Maya</h4>
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
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-semibold shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#00386a] text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700"
                />
                <button 
                  type="submit"
                  className="bg-[#00386a] text-white p-3.5 rounded-xl hover:bg-[#002b52] transition-all shadow-lg shadow-blue-900/10 active:scale-90 flex items-center justify-center"
                >
                  <Send size={20} />
                </button>
              </form>
              <p className="text-[10px] text-center text-slate-400 mt-2 font-bold uppercase tracking-widest">Powered by Slotify AI</p>
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
