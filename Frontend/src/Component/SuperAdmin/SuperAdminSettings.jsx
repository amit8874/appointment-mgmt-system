import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Save, 
  Megaphone, 
  Globe,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import SuperAdminSidebar from './SuperAdminSidebar.jsx';

const SuperAdminSettings = () => {
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const handleSendBroadcast = async () => {
    // Placeholder for Broadcast API
    alert('Broadcast sent: ' + broadcastMessage);
    setBroadcastMessage('');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <SuperAdminSidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <Settings className="text-indigo-600" size={32} />
              System Settings
            </h1>
            <p className="text-gray-500 font-medium mt-1">Configure platform-wide defaults and global controls</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Global Broadcast */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Megaphone size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Global Broadcast System</h3>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                  Send a notification to all clinics on the platform. This will appear as a high-priority banner on their dashboards.
                </p>

                <div className="space-y-4">
                  <textarea 
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter announcement message..."
                    className="w-full h-32 p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
                  />
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Targets: 452 active clinics</span>
                    </div>
                    <button 
                      onClick={handleSendBroadcast}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                      <Save size={18} />
                      Publish Shout
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Platform Maintenance</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Shield className={isMaintenanceMode ? "text-red-500" : "text-amber-500"} size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Maintenance Mode</p>
                      <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest">Restricts organization access</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                    className={`w-14 h-7 rounded-full transition-all relative ${isMaintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isMaintenanceMode ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Mini Stats */}
            <div className="space-y-6">
               <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
                  <h3 className="text-lg font-bold mb-2">Security Level</h3>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-black italic">ULTRA</span>
                    <span className="text-indigo-200 font-bold mb-1 tracking-tight">PROTECTED</span>
                  </div>
                  <p className="text-indigo-100 text-xs font-medium leading-relaxed">
                    2FA enforced for all Super Admins. Automated backups running every 6 hours.
                  </p>
                  <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/20 backdrop-blur-md">
                    Security Audit
                  </button>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminSettings;
