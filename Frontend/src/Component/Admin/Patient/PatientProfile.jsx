import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Heart, Pill, Stethoscope,
  Clock, RefreshCcw, BookOpen, User, ClipboardList,
  ArrowLeft, Shield, Calendar as CalendarIcon, Edit2, Save, X
} from 'lucide-react';
import { patientApi, appointmentApi, medicalRecordApi } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// --- Utility Components ---

const DetailCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 transition duration-300 hover:shadow-md h-full">
    <div className="flex items-center text-indigo-600 mb-4">
      <div className="p-2 bg-indigo-50 rounded-lg mr-3">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
    <div className="text-slate-600 text-sm">
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start space-x-3 py-2 border-b border-slate-50 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5" />}
    <div className="flex-1">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className="text-slate-700 font-semibold break-words">{value || 'N/A'}</span>
    </div>
  </div>
);

// --- Tab Content Renderers ---

const TabPersonalInfo = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <DetailCard title="Basic Details" icon={User}>
      <InfoItem label="Full Name" value={data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim()} icon={User} />
      <InfoItem label="Date of Birth" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : 'N/A'} icon={Calendar} />
      <InfoItem label="Gender" value={data.gender} />
      <InfoItem label="Blood Group" value={data.bloodGroup} />
      <InfoItem label="Age" value={data.age ? `${data.age} ${data.ageType || 'Year'}` : 'N/A'} />
    </DetailCard>
    <DetailCard title="Contact Information" icon={Phone}>
      <InfoItem label="Contact Number" value={data.contactNumber || data.mobile} icon={Phone} />
      <InfoItem label="Email Address" value={data.email} icon={Mail} />
      <div className="pt-2 pl-7">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
        <p className="text-slate-700 font-medium text-sm leading-relaxed">
          {[data.address, data.city, data.state, data.zip].filter(Boolean).join(', ') || 'N/A'}
        </p>
      </div>
    </DetailCard>
  </div>
);

// --- Reusable Form Field Components (must be OUTSIDE EditProfileModal to avoid re-mount on every keystroke) ---
const Field = ({ label, value, onChange, type = 'text', options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    {options ? (
      <select
        value={value}
        onChange={onChange}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        {options.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      />
    )}
  </div>
);

const TextArea = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <textarea
      rows={3}
      value={value}
      onChange={onChange}
      className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
    />
  </div>
);

// --- Edit Profile Modal ---
const EditProfileModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState({
    designation: data.designation || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    age: data.age || '',
    ageType: data.ageType || 'Year',
    gender: data.gender || '',
    bloodGroup: data.bloodGroup || '',
    mobile: data.mobile || data.contactNumber || '',
    email: data.email || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zip: data.zip || '',
    emergencyContact: data.emergencyContact || '',
    emergencyPhone: data.emergencyPhone || '',
    allergies: data.allergies || '',
    pastMedicalHistory: data.pastMedicalHistory || data.medicalHistory || '',
    currentMedications: data.currentMedications || '',
    bloodPressure: data.vitals?.bloodPressure || data.bloodPressure || '',
    weight: data.vitals?.weight || data.weight || '',
    height: data.vitals?.height || data.height || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await patientApi.update(data._id, {
        ...form,
        fullName: `${form.designation ? form.designation + ' ' : ''}${form.firstName} ${form.lastName}`.trim(),
        contactNumber: form.mobile,
        medicalHistory: form.pastMedicalHistory,
        vitals: { bloodPressure: form.bloodPressure, weight: form.weight, height: form.height }
      });
      toast.success('Patient profile updated successfully!');
      onSave(updated);
      onClose();
    } catch (err) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center rounded-t-3xl">
          <div>
            <h2 className="text-xl font-black text-slate-900">Edit Patient Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Changes will be saved to the database</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-8">
          {/* Personal Info */}
          <section>
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={14} /> Personal Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Designation" value={form.designation} onChange={set('designation')} options={['', 'MR.', 'MS.', 'MRS.', 'MISS', 'SHRI', 'SMT.']} />
              <Field label="First Name" value={form.firstName} onChange={set('firstName')} />
              <Field label="Last Name" value={form.lastName} onChange={set('lastName')} />
              <Field label="Gender" value={form.gender} onChange={set('gender')} options={['', 'Male', 'Female', 'Other']} />
              <Field label="Age" value={form.age} onChange={set('age')} type="number" />
              <Field label="Age Type" value={form.ageType} onChange={set('ageType')} options={['Year', 'Month', 'Days']} />
              <Field label="Blood Group" value={form.bloodGroup} onChange={set('bloodGroup')} options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            </div>
          </section>

          {/* Contact Info */}
          <section>
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Phone size={14} /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Mobile Number" value={form.mobile} onChange={set('mobile')} type="tel" />
              <Field label="Email Address" value={form.email} onChange={set('email')} type="email" />
              <Field label="Address" value={form.address} onChange={set('address')} />
              <Field label="City" value={form.city} onChange={set('city')} />
              <Field label="State" value={form.state} onChange={set('state')} />
              <Field label="Zip / Pin Code" value={form.zip} onChange={set('zip')} />
            </div>
          </section>

          {/* Emergency */}
          <section>
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person Name" value={form.emergencyContact} onChange={set('emergencyContact')} />
              <Field label="Contact Person Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} type="tel" />
            </div>
          </section>

          {/* Medical */}
          <section>
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart size={14} /> Medical Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Field label="Blood Pressure" value={form.bloodPressure} onChange={set('bloodPressure')} />
              <Field label="Weight (kg)" value={form.weight} onChange={set('weight')} type="number" />
              <Field label="Height (cm)" value={form.height} onChange={set('height')} type="number" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <TextArea label="Past Medical History" value={form.pastMedicalHistory} onChange={set('pastMedicalHistory')} />
              <TextArea label="Known Allergies" value={form.allergies} onChange={set('allergies')} />
              <TextArea label="Current Medications" value={form.currentMedications} onChange={set('currentMedications')} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-5 flex justify-end gap-3 rounded-b-3xl">
          <button onClick={onClose} className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Save size={16} />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const TabMedicalHistory = ({ data }) => (
  <div className="space-y-6">
    <DetailCard title="Emergency Contact" icon={Shield}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoItem label="Contact Person" value={data.emergencyContact} icon={User} />
        <InfoItem label="Emergency Phone" value={data.emergencyPhone} icon={Phone} />
      </div>
    </DetailCard>

    <DetailCard title="Conditions & Allergies" icon={BookOpen}>
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Past Medical History</span>
          <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            {data.pastMedicalHistory || data.medicalHistory || 'No history recorded'}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-2">Known Allergies</span>
          <p className="text-red-700 font-medium bg-red-50 p-3 rounded-xl border border-red-100 italic">
            {data.allergies || 'None reported'}
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Current Medications</span>
          <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            {data.currentMedications || 'None recorded'}
          </p>
        </div>
      </div>
    </DetailCard>
    
    <DetailCard title="Vitals & Metrics" icon={Heart}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InfoItem label="Blood Pressure" value={data.vitals?.bloodPressure || data.bloodPressure} />
        <InfoItem label="Weight (kg)" value={data.vitals?.weight || data.weight} />
        <InfoItem label="Height (cm)" value={data.vitals?.height || data.height} />
      </div>
    </DetailCard>
  </div>
);

const TabPrescriptions = ({ appointments, medicalRecords = [] }) => {
  const apptPrescriptions = appointments.filter(a => a.visitNotes && a.visitNotes.trim() !== '');
  
  // Combine both sources
  const allPrescriptions = [
    ...apptPrescriptions.map(a => ({
      id: a._id,
      date: a.date,
      time: a.time,
      doctorName: a.doctorName,
      notes: a.visitNotes,
      type: 'Visit Note',
      reason: a.reason || 'General Visit'
    })),
    ...medicalRecords.filter(r => r.type === 'Prescription').map(r => ({
      id: r._id,
      date: r.date,
      time: new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: r.doctorName,
      notes: r.description,
      type: 'Record',
      reason: r.title
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Prescription History</h3>
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">{allPrescriptions.length} Records</span>
      </div>

      <div className="space-y-4">
        {allPrescriptions.length > 0 ? (
          allPrescriptions.map((p, idx) => (
            <div key={p.id || idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-all"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-lg shadow-indigo-100 ${p.type === 'Record' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white`}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{new Date(p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dr. {p.doctorName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  <Clock size={10} />
                  {p.time}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl p-4 text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap shadow-sm">
                {p.notes}
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Context:</span>
                <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md ${p.type === 'Record' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {p.reason}
                </span>
                <span className="text-[9px] font-bold text-slate-300 ml-auto uppercase tracking-tighter">{p.type}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Pill size={32} />
            </div>
            <div>
              <p className="text-slate-800 font-bold">No Prescriptions Found</p>
              <p className="text-slate-400 text-xs mt-1">Prescriptions are automatically added here after visit notes are saved.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabAppointments = ({ appointments, onRebook }) => {
  const upcoming = appointments.filter(a => a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled');

  const AppointmentItem = ({ appt }) => (
    <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString()} at {appt.time}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
              <Stethoscope size={12} className="mr-1" /> {appt.doctorName} ({appt.specialty})
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
          appt.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700' :
            appt.status?.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
          }`}>
          {appt.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 italic bg-white/50 p-2 rounded-lg border border-slate-50 mb-4">"{appt.reason || 'No reason specified'}"</p>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => onRebook(appt)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCcw size={12} /> Re-book
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Current & Upcoming</h3>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-black">{upcoming.length}</span>
        </div>
        <div className="space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map(appt => <AppointmentItem key={appt._id} appt={appt} />)
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm font-medium">No active appointments</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">History</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black">{past.length}</span>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {past.map(appt => <AppointmentItem key={appt._id} appt={appt} />)}
        </div>
      </div>
    </div>
  );
};

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [showEditModal, setShowEditModal] = useState(false);

  const tabs = [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'medical', name: 'Medical History', icon: ClipboardList },
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: Calendar },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get patient details
        const patientData = await patientApi.getById(id);
        setData(patientData);

        // 2. Fetch ALL appointments for this patient
        const summaryResponse = await appointmentApi.getSummary(id);
        setAppointments(summaryResponse);

        // 3. Fetch Medical Records (for ad-hoc prescriptions)
        const records = await medicalRecordApi.getByPatient(id);
        setMedicalRecords(records);
      } catch (error) {
        console.error('Error fetching patient profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGoBack = () => {
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard?tab=Patients');
    } else {
      navigate('/receptionist/patients');
    }
  };

  const handleRebook = (appt) => {
    // Navigate to appointment form with pre-filled state
    if (location.pathname.startsWith('/admin')) {
      const rebookData = {
        patientId: data.patientId,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        firstName: data.firstName || data.fullName?.split(' ')[0] || '',
        lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
        patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
        patientEmail: data.email || '',
        gender: data.gender,
        patientAge: data.age,
        ageType: data.ageType || 'Year',
        doctorId: appt.doctorId,
        doctorName: appt.doctorName,
        specialty: appt.specialty,
        reason: appt.reason,
        patient: data
      };
      navigate('/admin-dashboard', { state: { activeTab: 'Calendar View', rebookData } });
    } else {
      const rebookData = {
        patientId: data.patientId,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        firstName: data.firstName || data.fullName?.split(' ')[0] || '',
        lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
        patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
        patientEmail: data.email || '',
        gender: data.gender,
        patientAge: data.age,
        ageType: data.ageType || 'Year',
        doctorId: appt.doctorId,
        doctorName: appt.doctorName,
        specialty: appt.specialty,
        reason: appt.reason,
        patient: data
      };
      navigate('/receptionist/new-appointment', { state: { rebookData } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          />
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      {/* Premium Hero Section */}
      <div className="relative h-64 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-end pb-12 relative z-10">
          <div className="flex items-center space-x-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group"
            >
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl border-4 border-white/20 shadow-2xl flex items-center justify-center bg-indigo-600/30 backdrop-blur-sm">
                <User size={64} className="text-white opacity-80" />
              </div>
            </motion.div>

            <div className="text-white">
              <div className="flex items-center gap-3">
                <button onClick={handleGoBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors mb-2">
                  <ArrowLeft size={18} />
                </button>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                  {data.fullName || `${data.firstName} ${data.lastName}`}
                </h1>
              </div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-3 text-slate-300"
              >
                <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Patient ID: {data.patientId}
                </span>
                <div className="flex items-center text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Active Patient
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-3xl p-4 sticky top-8">
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                      }`}
                  >
                    <tab.icon size={20} className={`${activeTab === tab.key ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    <span className="font-bold text-sm tracking-wide">{tab.name}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Edit2 size={16} /> Edit Profile
                </button>
                <button
                  onClick={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100"
                >
                  <RefreshCcw size={16} /> New Appointment
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 min-h-[500px]"
              >
                {activeTab === 'personal' && <TabPersonalInfo data={data} />}
                {activeTab === 'medical' && <TabMedicalHistory data={data} />}
                {activeTab === 'prescriptions' && <TabPrescriptions appointments={appointments} medicalRecords={medicalRecords} />}
                {activeTab === 'appointments' && (
                  <TabAppointments appointments={appointments} onRebook={handleRebook} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          data={data}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => setData(prev => ({ ...prev, ...updated }))}
        />
      )}
    </div>
  );
};

export default PatientProfile;
