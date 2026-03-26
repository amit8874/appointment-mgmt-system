import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import PharmacySidebar from './PharmacySidebar.jsx';
import BroadcastAlertModal from './BroadcastAlertModal.jsx';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';
import { Menu, Store } from 'lucide-react';

const PharmacyLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [isAccepting, setIsAccepting] = useState(false);

  // Poll for new broadcasts globally
  useEffect(() => {
    const checkNewBroadcasts = async () => {
      try {
        const broadcasts = await pharmacyApi.getBroadcastedOrders();
        console.log("[Pharmacy] Fetched broadcasts:", broadcasts);
        console.log("[Pharmacy] Dismissed IDs:", dismissedIds);
        
        // Find the first broadcast that hasn't been dismissed yet
        const newBroadcast = broadcasts.find(b => !dismissedIds.has(b._id));
        
        if (newBroadcast && (!activeAlert || activeAlert._id !== newBroadcast._id)) {
          console.log("[Pharmacy] New broadcast alert triggered:", newBroadcast);
          setActiveAlert(newBroadcast);
          // Play a subtle alert sound if possible, or just show the modal
        } else if (!newBroadcast && activeAlert) {
          console.log("[Pharmacy] Clearing active alert (no longer available)");
          setActiveAlert(null); // Clear if no longer available
        }
      } catch (err) {
        console.error("Global broadcast poll failed:", err);
      }
    };

    checkNewBroadcasts();
    const interval = setInterval(checkNewBroadcasts, 8000); // Poll every 8 seconds
    return () => clearInterval(interval);
  }, [dismissedIds, activeAlert]);

  const handleAccept = async (id) => {
    setIsAccepting(true);
    try {
      await pharmacyApi.acceptBroadcastedOrder(id);
      toast.success("Order accepted successfully!");
      setDismissedIds(prev => new Set([...prev, id]));
      setActiveAlert(null);
      navigate('/pharmacy/orders'); // Take user to their active orders
    } catch (err) {
      console.error("Failed to accept alert:", err);
      toast.error(err.response?.data?.message || "Failed to accept order");
    } finally {
      setIsAccepting(false);
    }
  };

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
        onAccept={handleAccept}
        onReject={handleReject}
        isAccepting={isAccepting}
      />
    </div>
  );
};

export default PharmacyLayout;
