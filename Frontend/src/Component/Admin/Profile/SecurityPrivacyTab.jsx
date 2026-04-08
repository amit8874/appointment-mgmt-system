import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Key, Monitor, Smartphone, Globe, 
  Trash2, AlertTriangle, ShieldCheck, History,
  Lock, ArrowRight, CheckCircle2
} from 'lucide-react';

const SecurityPrivacyTab = ({ 
  sessions = [], 
  onRevokeSession,
  onUpdatePassword 
}) => {
  const getDeviceIcon = (device) => {
    const d = device.toLowerCase();
    if (d.includes('iphone') || d.includes('android') || d.includes('mobile')) return Smartphone;
    return Monitor;
  };

  const formatLastSeen = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMins < 5) return 'Active Now';
    if (diffInMins < 60) return `\${diffInMins} minutes ago`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `\${diffInHours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Session Security Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Monitor size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Sessions</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Manage your active logins across devices.</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const Icon = getDeviceIcon(session.device);
              return (
                <div key={session.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{session.device}</h4>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>IP: {session.ip}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span>Last Seen: {formatLastSeen(session.lastActive)}</span>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button 
                      onClick={() => onRevokeSession(session.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-slate-400">No active sessions found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Two Factor Authentication */}
      <div className="bg-slate-900 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-indigo-400 mb-4">
              <ShieldCheck size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Security Recommended</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-3">Two-Factor Authentication</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </p>
          </div>
          <button className="whitespace-nowrap px-8 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">
            Enable 2FA Now
          </button>
        </div>
      </div>

      {/* Security Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all mb-4">
            <Key size={18} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Change Password</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
            Regularly changing your password keeps your clinic data safe.
          </p>
          <button 
            onClick={onUpdatePassword}
            className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:gap-3 transition-all"
          >
            Update Password <ArrowRight size={14} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all mb-4">
            <History size={18} />
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Login History</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
            View a detailed log of all successful logins to your account.
          </p>
          <button className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:gap-3 transition-all">
            View All Logs <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityPrivacyTab;
