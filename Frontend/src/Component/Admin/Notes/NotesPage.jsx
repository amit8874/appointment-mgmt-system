import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Calendar, Clock, User, Stethoscope, Search,
  Filter, Plus, Trash2, Edit3, ArrowLeft, RefreshCw,
  CheckCircle, AlertCircle, AlertTriangle, Copy, ExternalLink,
  ChevronDown, X, Phone, Tag, Sparkles, Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { clinicalNoteApi } from '../../../services/api';

export default function NotesPage({ onBack, defaultTab = 'today' }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(defaultTab); // 'today' | 'all'
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalCount: 0, todayCount: 0 });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal State for Create / Edit Note
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    note: '',
    patientName: '',
    patientPhone: '',
    doctorName: user?.role === 'doctor' ? (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()) : '',
    noteType: 'appointment',
    priority: 'medium',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Notes
  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await clinicalNoteApi.getAllNotes({
        timeframe: activeTab,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        noteType: selectedType !== 'all' ? selectedType : undefined,
        search: searchTerm.trim() || undefined
      });

      if (res && res.success) {
        setNotes(res.notes || []);
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      toast.error('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [activeTab, selectedPriority, selectedType]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await clinicalNoteApi.deleteGeneralNote(noteId);
      if (res && res.success) {
        toast.success('Note deleted successfully');
        fetchNotes();
      } else {
        toast.error(res?.message || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete note');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (note) => {
    setEditingNote(note);
    setModalForm({
      title: note.title || '',
      note: note.note || '',
      patientName: note.patientName || note.patientId?.fullName || `${note.patientId?.firstName || ''} ${note.patientId?.lastName || ''}`.trim() || '',
      patientPhone: note.patientPhone || note.patientId?.mobile || '',
      doctorName: note.doctorName || note.doctorId?.name || '',
      noteType: note.noteType || 'general',
      priority: note.priority || 'medium',
      appointmentDate: note.appointmentDate || '',
      appointmentTime: note.appointmentTime || ''
    });
    setIsModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingNote(null);
    setModalForm({
      title: 'Appointment Note',
      note: '',
      patientName: '',
      patientPhone: '',
      doctorName: user?.role === 'doctor' ? (user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()) : '',
      noteType: 'appointment',
      priority: 'medium',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: ''
    });
    setIsModalOpen(true);
  };

  // Save Modal Note (Create or Update)
  const handleSaveModalNote = async (e) => {
    e.preventDefault();
    if (!modalForm.note.trim()) {
      toast.warning('Please enter the note content');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingNote) {
        const res = await clinicalNoteApi.updateGeneralNote(editingNote._id, modalForm);
        if (res && res.success) {
          toast.success('Note updated successfully');
          setIsModalOpen(false);
          fetchNotes();
        } else {
          toast.error(res?.message || 'Failed to update note');
        }
      } else {
        const res = await clinicalNoteApi.createStandalone(modalForm);
        if (res && res.success) {
          toast.success('Note saved successfully');
          setIsModalOpen(false);
          fetchNotes();
        } else {
          toast.error(res?.message || 'Failed to save note');
        }
      }
    } catch (err) {
      console.error('Save note error:', err);
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy Note Text
  const handleCopyNote = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.info('Note copied to clipboard');
  };

  // Navigate back
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200">Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Medium</span>;
    }
  };

  // Note Type Badge Helper
  const renderTypeBadge = (type) => {
    const labels = {
      appointment: 'Appointment Note',
      general: 'General Note',
      diagnosis: 'Diagnosis',
      treatment: 'Treatment',
      follow_up: 'Follow-up',
      observation: 'Observation',
      complaint: 'Chief Complaint',
      internal: 'Internal Staff'
    };
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
        <Tag className="w-3 h-3 mr-1" />
        {labels[type] || type || 'General'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-gray-900 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Back to Patient Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                Doctor & Patient Notes
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Review and record appointment notes, clinical findings, and patient instructions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchNotes}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            title="Refresh Notes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        {/* Tab Buttons (Today vs All) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-gray-700/60 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Today Notes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'today'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}>
                {stats.todayCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Notes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'all'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}>
                {stats.totalCount}
              </span>
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-bold text-gray-800 dark:text-gray-200">{notes.length}</span> {activeTab === 'today' ? "today's" : 'total'} notes
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient, doctor, note text, phone..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Note Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              <option value="all">All Categories</option>
              <option value="appointment">Appointment Note</option>
              <option value="general">General Note</option>
              <option value="diagnosis">Diagnosis</option>
              <option value="treatment">Treatment</option>
              <option value="follow_up">Follow-up</option>
              <option value="observation">Observation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {activeTab === 'today' ? 'No Notes for Today' : 'No Notes Found'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mb-5">
            {activeTab === 'today'
              ? "No doctor notes have been created today yet. Doctor notes recorded in the New Appointment modal will show up right here."
              : 'There are no notes matching your search or filters. Create a new note to get started.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        /* Notes Cards Grid - Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const patientName = note.patientName || note.patientId?.fullName || `${note.patientId?.firstName || ''} ${note.patientId?.lastName || ''}`.trim() || 'Walk-in Patient';
            const patientPhone = note.patientPhone || note.patientId?.mobile || '';
            const patientSeqId = note.patientId?.patientId || '';
            const doctorName = note.doctorName || note.doctorId?.name || 'Assigned Doctor';
            const createdAtDate = new Date(note.createdAt);
            const dateStr = createdAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = createdAtDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={note._id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Title & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {note.title || 'Clinical Note'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {renderPriorityBadge(note.priority)}
                        {renderTypeBadge(note.noteType)}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyNote(note.note)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Copy Note Text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(note)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                        title="Edit Note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Note Body Text */}
                  <div className="bg-slate-50/70 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 mb-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {note.note}
                  </div>
                </div>

                {/* Footer Metadata: Patient, Doctor, Timestamp */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 space-y-2 text-xs">
                  {/* Patient Info */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="font-bold text-gray-900 dark:text-white truncate block">
                          {patientName}
                        </span>
                        {patientSeqId && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            #{patientSeqId}
                          </span>
                        )}
                      </div>
                    </div>

                    {patientPhone && (
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-[11px] shrink-0">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {patientPhone}
                      </span>
                    )}
                  </div>

                  {/* Doctor & Appointment Info */}
                  <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px] pt-1">
                    <div className="flex items-center gap-1 truncate">
                      <Stethoscope className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate">Dr. {doctorName.replace(/^Dr\.?\s*/i, '')}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr} • {timeStr}</span>
                    </div>
                  </div>

                  {/* Appointment Tag if Linked */}
                  {(note.appointmentDate || note.appointmentTime) && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 p-1.5 rounded-lg text-[10px] flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        Appt: {note.appointmentDate || 'Today'}
                      </span>
                      {note.appointmentTime && <span>{note.appointmentTime}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Small Note Modal (Create or Edit Note) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {editingNote ? 'Edit Doctor Note' : 'Create New Doctor Note'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModalNote} className="p-6 space-y-4">
              {/* Title & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={modalForm.title}
                    onChange={(e) => setModalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="E.g., Appointment Note, Tooth Evaluation..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={modalForm.priority}
                    onChange={(e) => setModalForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Patient Name & Doctor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={modalForm.patientName}
                    onChange={(e) => setModalForm(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Enter patient name..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    value={modalForm.doctorName}
                    onChange={(e) => setModalForm(prev => ({ ...prev, doctorName: e.target.value }))}
                    placeholder="Dr. Name..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Note Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Doctor's Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  required
                  value={modalForm.note}
                  onChange={(e) => setModalForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Type the clinical notes, patient observations, findings, or instructions here..."
                  className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
