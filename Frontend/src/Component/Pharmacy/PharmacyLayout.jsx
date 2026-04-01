import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import PharmacySidebar from './PharmacySidebar.jsx';
import BroadcastAlertModal from './BroadcastAlertModal.jsx';
import QuoteAcceptedModal from './QuoteAcceptedModal.jsx';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';
import { Menu, Store } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import PharmacyMaya from './PharmacyMaya.jsx';

const PharmacyLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [winnerData, setWinnerData] = useState(null);
  const socketRef = useRef(null);

  // Socket.io Real-time Setup
  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const pharmacyId = user._id || user.id;
    let socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.replace('/api', '');
    }
    
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("[Pharmacy] Connected to socket, joining room:", `pharmacy_${pharmacyId}`);
      socket.emit('join-pharmacy', pharmacyId);
    });

    socket.on('quote_accepted', (data) => {
      console.log("[Pharmacy] Quote Accepted Event Received:", data);
      setWinnerData(data);
      // Play success sound
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
    });

    socket.on('new-broadcast', (data) => {
       // Optional: Could trigger the alert modal instantly if backend emits this
       // For now keeping the poll as backup
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  // Poll for new broadcasts globally (Backup mechanism)
  useEffect(() => {
    const checkNewBroadcasts = async () => {
      try {
        const broadcasts = await pharmacyApi.getBroadcastedOrders();
        
        // Find the first broadcast that hasn't been dismissed yet
        const newBroadcast = broadcasts.find(b => !dismissedIds.has(b._id));
        
        if (newBroadcast && (!activeAlert || activeAlert._id !== newBroadcast._id)) {
          setActiveAlert(newBroadcast);
        } else if (!newBroadcast && activeAlert) {
          setActiveAlert(null); 
        }
      } catch (err) {
        console.error("Global broadcast poll failed:", err);
      }
    };

    checkNewBroadcasts();
    const interval = setInterval(checkNewBroadcasts, 10000); 
    return () => clearInterval(interval);
  }, [dismissedIds, activeAlert]);

  const handleReject = () => {
    if (activeAlert) {
      setDismissedIds(prev => new Set([...prev, activeAlert._id]));
      setActiveAlert(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <PharmacySidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <div className="flex-1 flex flex-col md:ml-72 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              <Store size={18} />
            </div>
            <span className="font-black text-slate-900 text-sm uppercase tracking-tight">Pharmacy</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <BroadcastAlertModal 
        broadcast={activeAlert}
        onReject={handleReject}
      />

      <QuoteAcceptedModal 
        data={winnerData}
        onClose={() => setWinnerData(null)}
      />

      <PharmacyMaya />
    </div>
  );
};

export default PharmacyLayout;
