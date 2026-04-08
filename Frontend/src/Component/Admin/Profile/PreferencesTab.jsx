import React from 'react';
import { Bell, MessageSquare, Globe, BellRing, ShieldAlert, FileBarChart } from 'lucide-react';

const PreferencesTab = ({ notifications, onToggleNotification, whatsapp, onToggleWhatsapp, loading }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Notifications Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Configure how you receive alerts and updates.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-2">
            <ToggleOption 
                icon={ShieldAlert}
                color="text-rose-500"
                bg="bg-rose-50"
                label="Security Alerts"
                description="Get notified about login attempts and password changes."
                isChecked={notifications?.securityAlerts !== false}
                onToggle={() => onToggleNotification('securityAlerts')}
            />
            <ToggleOption 
                icon={BellRing}
                color="text-blue-500"
                bg="bg-blue-50"
                label="System Updates"
                description="Stay informed about platform maintenance and new features."
                isChecked={notifications?.systemUpdates !== false}
                onToggle={() => onToggleNotification('systemUpdates')}
            />
            <ToggleOption 
                icon={FileBarChart}
                color="text-emerald-500"
                bg="bg-emerald-50"
                label="Weekly Reports"
                description="Receive a monthly summary of your clinic's performance."
                isChecked={notifications?.weeklyReports !== false}
                onToggle={() => onToggleNotification('weeklyReports')}
            />
        </div>
      </div>

      {/* WhatsApp Integration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">WhatsApp Integration</h3>
            <p className="text-xs text-slate-500">Connect your WhatsApp for automated reminders.</p>
          </div>
        </div>

        <div className="p-8">
            <div className={`p-6 rounded-2xl border flex items-center justify-between transition-all ${
                whatsapp?.connected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                         whatsapp?.connected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900">{whatsapp?.connected ? 'Connected' : 'Not Connected'}</h5>
                        <p className="text-xs text-slate-500 mt-0.5">Automated appointment reminders via WhatsApp</p>
                    </div>
                </div>
                <button 
                    onClick={onToggleWhatsapp}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        whatsapp?.connected ? 'bg-white text-emerald-600 border border-emerald-200 shadow-sm' : 'bg-slate-900 text-white'
                    }`}
                >
                    {whatsapp?.connected ? 'Disconnect' : 'Connect Now'}
                </button>
            </div>
        </div>
      </div>

      {/* Language & Region Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Language & Region</h3>
          </div>
        </div>

        <div className="p-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Display Language</label>
              <select className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none">
                <option>English (UK)</option>
                <option>English (US)</option>
                <option>Hindi (Beta)</option>
              </select>
           </div>
        </div>
      </div>
    </div>
  );
};

const ToggleOption = ({ icon: Icon, color, bg, label, description, isChecked, onToggle }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group">
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
                <Icon size={20} />
            </div>
            <div>
                <h5 className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{label}</h5>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
        </div>
        <button 
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isChecked ? 'bg-slate-900 shadow-[0_0_10px_rgba(15,23,42,0.2)]' : 'bg-slate-200'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${isChecked ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
);

export default PreferencesTab;
