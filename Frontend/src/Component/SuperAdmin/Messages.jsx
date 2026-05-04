import React, { useState, useEffect } from 'react';
import { contactApi } from '../../services/api';
import { TableSkeleton } from '../../components/Shared/DashboardSkeletons';
import { Mail, User, Building2, MessageSquare, Trash2, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { toast } from 'react-toastify';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await contactApi.getAll();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await contactApi.updateStatus(id, status);
      setMessages(messages.map(msg => msg._id === id ? { ...msg, status } : msg));
      toast.success(`Message marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await contactApi.delete(id);
      setMessages(messages.filter(msg => msg._id !== id));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === 'all' || msg.status === filter;
    const matchesSearch = 
      msg.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'read': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'replied': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contact Messages</h1>
            <p className="text-slate-500 font-medium mt-1">Inquiries from the public contact form</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-slate-700 text-sm"
              />
            </div>
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700 text-sm appearance-none"
            >
              <option value="all">All Messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-20 shadow-sm border border-slate-200 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No messages found</h3>
            <p className="text-slate-500 font-medium">When users contact you via the form, their messages will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
              <div key={msg._id} className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 hover:border-blue-200 transition-all group relative overflow-hidden">
                {msg.status === 'new' && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                )}
                
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="lg:w-1/4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-bold border border-slate-100">
                        {msg.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 leading-none">{msg.fullName}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{msg.organization || 'No Organization'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Mail size={14} />
                        <span className="truncate">{msg.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Clock size={14} />
                        <span>{formatDate(msg.createdAt)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(msg.status)}`}>
                        {msg.status}
                      </span>
                    </div>
                  </div>

                  <div className="lg:flex-1 lg:border-l lg:border-slate-50 lg:pl-8 space-y-3">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight italic">"{msg.subject}"</h3>
                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap italic">
                      {msg.message}
                    </p>
                  </div>

                  <div className="lg:w-auto flex lg:flex-col gap-2 items-end justify-end lg:justify-start">
                    {msg.status === 'new' && (
                      <button 
                        onClick={() => handleStatusUpdate(msg._id, 'read')}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        title="Mark as Read"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {msg.status !== 'replied' && (
                       <button 
                         onClick={() => handleStatusUpdate(msg._id, 'replied')}
                         className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                         title="Mark as Replied"
                       >
                         <Mail size={18} />
                       </button>
                    )}
                    <button 
                      onClick={() => handleDelete(msg._id)}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      title="Delete Message"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
