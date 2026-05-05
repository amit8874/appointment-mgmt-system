import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Heart, Pill, Stethoscope,
  Clock, RefreshCcw, BookOpen, User, ClipboardList, FlaskConical,
  ArrowLeft, Shield, Calendar as CalendarIcon, Edit2, Save, X, MessageSquare, Plus, Printer, Download
} from 'lucide-react';
import WhatsAppModal from '../../../components/common/WhatsAppModal';
import { patientApi, appointmentApi, medicalRecordApi, emailApi, prescriptionTemplateApi, organizationApi, centralDoctorApi } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import PrescriptionModal from './PrescriptionModal';
import TemplateModal from './TemplateModal';
import PrintablePrescription from './PrintablePrescription';
import { useAuth } from '../../../context/AuthContext';

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

const TabPersonalInfo = ({ data, appointments = [], onEdit, onRebook }) => {
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled' || a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-slate-200 mt-4 bg-white/50 rounded-b-3xl">
      {/* Column 1: Basic Details */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
            <User size={16} className="text-indigo-400" /> Basic Details
          </h3>
          <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
        </div>
        <div className="space-y-4 mb-8">
          <InfoItem label="Full Name" value={data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim()} />
          <InfoItem label="Date of Birth" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : 'N/A'} />
          <InfoItem label="Gender" value={data.gender} />
          <InfoItem label="Blood Group" value={data.bloodGroup} />
          <InfoItem label="Age" value={data.age ? `${data.age} ${data.ageType || 'Year'}` : 'N/A'} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
            <div className="p-1.5 bg-indigo-50 rounded-lg"><Phone size={14} className="text-indigo-600" /></div> Contact Information
          </h3>
        </div>
        <div className="space-y-4">
          <InfoItem label="Contact Number" value={data.contactNumber || data.mobile} icon={Phone} />
          <InfoItem label="Email Address" value={data.email} icon={Mail} />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
            <p className="text-slate-700 font-medium text-sm">
              {[data.address, data.city, data.state, data.zip].filter(Boolean).join(', ') || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Column 2: Past Visits Timeline */}
      <div className="border-l-2 border-r-2 border-black/90 p-6 relative">
        <div className="flex items-center gap-2 mb-6">
          <CalendarIcon size={16} className="text-indigo-400" />
          <h3 className="text-sm font-black text-indigo-900 tracking-widest uppercase">Past Visits</h3>
        </div>

        <div className="relative border-l-2 border-black ml-4 space-y-10 py-6 min-h-[300px]">
          {/* Active appts logic */}
          {(() => {
            const activeAppts = appointments.filter(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase()));
            if (activeAppts.length === 0) {
              return (
                <div className="relative flex items-center">
                  <div className="absolute -left-[11px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-white"></div>
                  <div className="w-8 border-b-2 border-black"></div>
                  <span className="ml-2 px-3 py-1 bg-slate-100/50 text-slate-400 font-bold text-sm rounded-lg backdrop-blur-sm shadow-sm border border-slate-100">No active appointments</span>
                </div>
              );
            }
            return activeAppts.map(appt => (
              <div key={appt._id} className="relative flex items-center">
                <div className="absolute -left-[11px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-white"></div>
                <div className="w-8 border-b-2 border-black"></div>
                <div className="ml-2 flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-sm tracking-tight">
                    {new Date(appt.date).toLocaleDateString()} at {appt.time}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    {appt.status || 'Upcoming'}
                  </span>
                </div>
              </div>
            ));
          })()}

          {/* Past appts */}
          {appointments.filter(a => !['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase())).slice(0, 5).map(appt => (
            <div key={appt._id} className="relative flex items-center">
              <div className="absolute -left-[11px] w-5 h-5 bg-indigo-600 rounded-full border-4 border-white"></div>
              <div className="w-8 border-b-2 border-black"></div>
              <div className="ml-2 flex items-center gap-3">
                <span className="font-bold text-slate-800 text-sm tracking-tight">
                  {new Date(appt.date).toLocaleDateString()} at {appt.time}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  {appt.status || 'Completed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Vitals & Medical */}
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Heart size={14} className="text-indigo-600" /></div> Vitals & Metrics
            </h3>
          </div>
          <div className="flex items-center justify-between border-b-4 border-black pb-4">
            <div className="flex flex-col border-r border-slate-200 pr-4">
              <span className="text-xl font-black text-slate-800">
                {(() => {
                  const h = parseFloat(data.vitals?.height || data.height || 0) / 100;
                  const w = parseFloat(data.vitals?.weight || data.weight || 0);
                  return (h > 0 && w > 0) ? (w / (h * h)).toFixed(1) : '--';
                })()}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">BMI</span>
            </div>
            <div className="flex flex-col border-r border-slate-200 px-4">
              <span className="text-xl font-black text-slate-800">{data.vitals?.weight || data.weight || '--'} <span className="text-sm">kg</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Weight</span>
            </div>
            <div className="flex flex-col border-r border-slate-200 px-4">
              <span className="text-xl font-black text-slate-800">{data.vitals?.height || data.height || '--'} <span className="text-sm">cm</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Height</span>
            </div>
            <div className="flex flex-col pl-4">
              <span className="text-xl font-black text-slate-800">{data.vitals?.bloodPressure || data.bloodPressure || '--'}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Blood pressure</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Shield size={14} className="text-indigo-600" /></div> Emergency Contact
            </h3>
            <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          </div>
          <div className="flex items-center justify-between border-b-4 border-black pb-4">
            <InfoItem label="Contact Person" value={data.emergencyContact} icon={User} />
            <InfoItem label="Emergency Phone" value={data.emergencyPhone} icon={Phone} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><BookOpen size={14} className="text-indigo-600" /></div> Conditions & Allergies
            </h3>
            <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          </div>
          <div className="space-y-4 border-l-4 border-black pl-4 py-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Past Medical History</span>
              <div className="bg-slate-50 border border-slate-100 p-2 rounded text-sm text-slate-600 font-medium">
                {data.pastMedicalHistory || data.medicalHistory || 'No history recorded'}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Known Allergies</span>
              <div className="bg-rose-50 border border-rose-100 p-2 rounded text-sm text-rose-600 font-medium italic">
                {data.allergies || 'None reported'}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Medications</span>
              <div className="bg-slate-50 border border-slate-100 p-2 rounded text-sm text-slate-600 font-medium">
                {data.currentMedications || 'None recorded'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Reusable Form Field Components ---
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
        fullName: (() => {
          const designation = form.designation ? form.designation.trim() : '';
          let firstName = form.firstName.trim();
          const lastName = form.lastName.trim();

          if (designation && firstName.toUpperCase().startsWith(designation.toUpperCase().replace(/\./g, ''))) {
            return `${firstName} ${lastName}`.trim();
          }

          return `${designation ? designation + ' ' : ''}${firstName} ${lastName}`.trim();
        })(),
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

          <section>
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person Name" value={form.emergencyContact} onChange={set('emergencyContact')} />
              <Field label="Contact Person Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} type="tel" />
            </div>
          </section>

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

const PrescriptionContent = ({ notes }) => {
  let data = null;
  try {
    if (notes && typeof notes === 'string' && notes.trim().startsWith('{')) {
      data = JSON.parse(notes);
    }
  } catch (e) {
    data = null;
  }

  if (!data) {
    return (
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap italic">
        {notes}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-3">
      {/* 1. VITALS */}
      {data.vitals && Object.values(data.vitals).some(v => v) && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-rose-50/40">
          <div className="flex items-center gap-1.5 w-28 shrink-0">
            <Heart size={12} className="text-rose-500 shrink-0" />
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest">Vitals</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {Object.entries(data.vitals).map(([key, val]) => val && (
              <span key={key} className="text-sm text-slate-700">
                <span className="text-slate-400 text-xs">{key.replace('_', ' ')}: </span>
                <span className="font-semibold">{val}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. DIAGNOSIS */}
      {data.diagnosis?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-indigo-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <Stethoscope size={12} className="text-indigo-500 shrink-0" />
            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest">Diagnosis</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.diagnosis.map(d => d.name).join(', ')}
          </p>
        </div>
      )}

      {/* 3. CHIEF COMPLAINTS */}
      {data.complaints?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <ClipboardList size={12} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Complaints</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.complaints.map(c => `${c.name} (${c.severity || 'Mild'})`).join(', ')}
          </p>
        </div>
      )}

      {/* 4. MEDICATIONS (Rx) */}
      {data.medications?.length > 0 && (
        <div className="bg-white">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <Pill size={12} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Rx — Medications</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Medicine</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Dose</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timing</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.medications.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                    {(m.composition || m.genericName) && (
                      <div className="text-[11px] text-slate-400 italic mt-0.5">
                        {m.composition || m.genericName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm font-semibold text-indigo-600">{m.dose}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.when?.toLowerCase().includes('before') ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {m.when}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{m.frequency}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{m.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. CLINICAL ADVICE */}
      {data.advice && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-blue-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <BookOpen size={12} className="text-blue-500 shrink-0" />
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">Advice</span>
          </div>
          <div>
            <p className="text-sm text-slate-700 leading-relaxed italic">"{data.advice}"</p>
            {data.translatedAdvice && (
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="font-semibold">Translated:</span> {data.translatedAdvice}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 6. INVESTIGATIONS */}
      {data.testsRequested?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-purple-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <FlaskConical size={12} className="text-purple-500 shrink-0" />
            <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-widest">Tests</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.testsRequested.map((t, i) => (
              <span key={i} className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium border border-purple-200">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TabPrescriptions = ({ appointments = [], medicalRecords = [], onNewPrescription, onOpenTemplateModal, onWhatsApp, onEmail, onPrint, onDownload, templates = [], selectedTemplate, setSelectedTemplate }) => {
  const allPrescriptions = [
    ...appointments.filter(a => a.visitNotes).map(a => ({
      id: a._id,
      date: a.date,
      time: a.time,
      doctorName: a.doctorName,
      doctorId: a.doctorId,
      specialty: a.specialty || a.doctorSpecialization,
      qualification: a.doctorQualification,
      notes: a.visitNotes,
      type: 'Visit Note',
      reason: a.reason || 'General Visit'
    })),
    ...medicalRecords.filter(r => r.type === 'Prescription').map(r => ({
      id: r._id,
      date: r.date,
      time: new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: r.doctorName,
      doctorId: r.doctorId,
      specialty: r.specialty || r.doctorSpecialization,
      qualification: r.doctorQualification,
      notes: r.description,
      type: 'Record',
      reason: r.title
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Prescription History</h3>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">{allPrescriptions.length} Records</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Prescription Layout</span>
            <select 
              value={selectedTemplate?._id || 'default'} 
              onChange={(e) => {
                if (e.target.value === 'default') {
                  setSelectedTemplate(null);
                } else {
                  const t = templates.find(temp => temp._id === e.target.value);
                  setSelectedTemplate(t);
                }
              }}
              className="bg-white border-2 border-indigo-100 rounded-xl px-4 py-1.5 text-[11px] font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:border-indigo-300 transition-all min-w-[180px]"
            >
              <option value="default">Oviaan System Default</option>
              {templates.filter(t => t._id && t.templateName).map(t => (
                <option key={t._id} value={t._id}>
                  {t.templateName} {t.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={onOpenTemplateModal}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <BookOpen size={14} /> Choose Template
          </button>
          <button 
            onClick={onNewPrescription}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={14} /> New Prescription
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {allPrescriptions.length > 0 ? (
          allPrescriptions.map((p, idx) => (
            <div key={p.id || idx} className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-full"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-lg shadow-indigo-100 ${p.type === 'Record' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white`}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{new Date(p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {p.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{p.doctorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => onEmail(p.notes)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <Mail size={16} />
                    <span className="text-sm font-semibold">Email</span>
                  </button>
                  <button onClick={() => onWhatsApp(p.notes)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <MessageSquare size={16} />
                    <span className="text-sm font-semibold">WhatsApp</span>
                  </button>
                  <button onClick={() => onDownload(p)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <Download size={16} />
                    <span className="text-sm font-semibold">Download</span>
                  </button>
                  <button onClick={() => onPrint(p)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <Printer size={16} />
                    <span className="text-sm font-semibold">Print</span>
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm ml-2">
                    <Clock size={10} />
                    {p.time}
                  </div>
                </div>
              </div>
              <PrescriptionContent notes={p.notes} />
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
        <button onClick={() => onRebook(appt)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
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
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'personal');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [printingPrescription, setPrintingPrescription] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);

  const fetchTemplates = async () => {
    if (user) {
      try {
        const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        const response = await prescriptionTemplateApi.list(orgId);
        if (response && response.templates) {
          setTemplates(response.templates);
          const def = response.templates.find(t => t.isDefault) || response.templates[0];
          setDefaultTemplate(def);
          setSelectedTemplate(def);
        }
      } catch (error) {
        console.error("Failed to fetch templates", error);
      }
    }
  };

  const fetchOrgDetails = async () => {
    const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
    if (!orgId) return;
    try {
      const org = await organizationApi.getById(orgId);
      if (org) setOrgDetails(org);
    } catch (error) {
      console.error("Failed to fetch organization details", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchOrgDetails();
    }
  }, [user?.organizationId, user?.organization?._id]);

  useEffect(() => {
    if (printingPrescription) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  }, [printingPrescription]);

  useEffect(() => {
    const handleAfterPrint = () => setPrintingPrescription(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleDownloadPDF = async (prescription) => {
    try {
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
      if (!orgId) {
        toast.error("Organization ID not found");
        return;
      }

      const pdfData = {
        organizationId: orgId,
        prescriptionData: prescription,
        patientData: {
          name: (() => {
            let name = data?.fullName || `${data?.firstName || ''} ${data?.lastName || ''}`.trim();
            // Clean redundant prefixes (e.g., "MR. MR.", "Dr. Dr.")
            const prefixes = ['MR', 'MS', 'MRS', 'MISS', 'DR', 'SHRI', 'SMT'];
            let parts = name.split(/\s+/);
            while (parts.length > 1) {
              const p0 = parts[0].toUpperCase().replace(/\./g, '');
              const p1 = parts[1].toUpperCase().replace(/\./g, '');
              if (prefixes.includes(p0) && (p0 === p1 || p1.startsWith(p0))) {
                parts.shift();
              } else {
                break;
              }
            }
            return parts.join(' ');
          })(),
          age: data?.age,
          gender: data?.gender
        },
        templateId: selectedTemplate?._id
      };

      toast.info("Generating PDF... Please wait.");
      const response = await prescriptionTemplateApi.generatePdf(pdfData);
      
      if (response && response.url) {
        // Construct full URL pointing to the backend
        const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
        const fileUrl = response.url.startsWith('/') ? `${baseUrl}${response.url}` : `${baseUrl}/${response.url}`;
        
        // Open the PDF directly in a new tab. The browser handles it natively.
        window.open(fileUrl, '_blank');
        toast.success("Prescription opened successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("PDF Download Error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleWhatsApp = (notes) => {
    let bodyText = notes;
    try {
      if (notes && typeof notes === 'string' && notes.trim().startsWith('{')) {
        const parsed = JSON.parse(notes);
        bodyText = `*Prescription Details*\n\n` +
          `*Medications:*\n${parsed.medications?.map(m => `• *${m.name}*${m.composition ? ` —(${m.composition})` : ''}\n  ${m.dose} (${m.frequency}) - ${m.when}`).join('\n\n')}\n\n` +
          `*Advice:* ${parsed.advice || 'N/A'}`;
      }
    } catch (e) { }
    setSelectedNotes(bodyText);
    setShowWhatsAppModal(true);
  };

  const handleEmail = async (notes) => {
    if (!data.email) {
      toast.warning("Please provide patient's email first in Personal Info.");
      setActiveTab('personal');
      return;
    }
    try {
      toast.info("Sending email...");
      await emailApi.sendPrescription({
        email: data.email,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        notes: notes,
        clinicName: orgDetails?.name || user?.organization?.name || user?.clinicName || "Oviaan Clinic",
        organizationId: user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null),
        useTemplate: true,
        templateId: selectedTemplate?._id
      });
      toast.success("Prescription with branded PDF sent to email successfully!");
    } catch (error) {
      console.error("Email Error:", error);
      toast.error("Failed to send email. Please check configuration.");
    }
  };

  const handlePrint = async (p) => {
    try {
      if (p.doctorId) {
        const doctor = await centralDoctorApi.getById(p.doctorId);
        if (doctor) {
          p.qualification = doctor.qualification || p.qualification;
          p.specialty = doctor.specialization || p.specialty || doctor.specialty;
          if (doctor.name) p.doctorName = doctor.name;
        }
      }
    } catch (error) {
      console.error("Failed to fetch doctor details for print", error);
    }
    setPrintingPrescription(p);
  };

  const tabs = [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: CalendarIcon }
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [activeTab]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const patientData = await patientApi.getById(id);
      setData(patientData);
      const summaryResponse = await appointmentApi.getSummary(id);
      setAppointments(summaryResponse);
      const records = await medicalRecordApi.getByPatient(id);
      setMedicalRecords(records);
    } catch (error) {
      console.error('Error fetching patient profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard', { state: { activeTab: 'Calendar View', rebookData } });
    } else {
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
    <>
      <div className="min-h-screen bg-[#f8fafc] font-sans print:hidden">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={handleGoBack} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-50">
                    <User size={24} className="text-indigo-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-slate-900 leading-none">
                      {(() => {
                        const rawName = data.fullName || `${data.firstName} ${data.lastName}`;
                        const prefixes = ['MR', 'MS', 'MRS', 'MISS', 'DR', 'SHRI', 'SMT'];
                        let parts = rawName.split(/\s+/);
                        while (parts.length > 1) {
                          const p0 = parts[0].toUpperCase().replace(/\./g, '');
                          const p1 = parts[1].toUpperCase().replace(/\./g, '');
                          if (prefixes.includes(p0) && (p0 === p1 || p1.startsWith(p0))) {
                            parts.shift();
                          } else {
                            break;
                          }
                        }
                        return parts.join(' ');
                      })()}
                    </h1>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                      ID: {data.patientId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><CalendarIcon size={12} className="text-slate-400" /> {data.age || 'N/A'} {data.ageType || 'Y'}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1"><User size={12} className="text-slate-400" /> {data.gender || 'N/A'}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {data.contactNumber || data.mobile || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === tab.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                  >
                    <tab.icon size={16} />
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setShowEditModal(true)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit Profile">
                  <Edit2 size={20} />
                </button>
                <button onClick={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200">
                  <RefreshCcw size={14} /> New Appointment
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="min-h-[calc(100vh-250px)]"
            >
              {activeTab === 'personal' && <TabPersonalInfo data={data} appointments={appointments} onEdit={() => setShowEditModal(true)} onRebook={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })} />}
              {activeTab === 'medical' && <TabMedicalHistory data={data} />}
              {activeTab === 'prescriptions' && (
                <TabPrescriptions
                  appointments={appointments}
                  medicalRecords={medicalRecords}
                  onWhatsApp={handleWhatsApp}
                  onEmail={handleEmail}
                  onPrint={handlePrint}
                  onDownload={handleDownloadPDF}
                  onNewPrescription={() => setShowPrescriptionModal(true)}
                  onOpenTemplateModal={() => setShowTemplateModal(true)}
                  templates={templates}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                />
              )}
              {activeTab === 'appointments' && <TabAppointments appointments={appointments} onRebook={handleRebook} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {showEditModal && <EditProfileModal data={data} onClose={() => setShowEditModal(false)} onSave={(updated) => setData(prev => ({ ...prev, ...updated }))} />}
        <PrescriptionModal isOpen={showPrescriptionModal} onClose={() => setShowPrescriptionModal(false)} patient={data} onSaveSuccess={() => fetchData(false)} />
        {data && <WhatsAppModal isOpen={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} patient={data} initialMessage={selectedNotes} />}
        <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSaveSuccess={fetchTemplates} />
      </div>

      {printingPrescription && (
        <div id="prescription-print-area" className="hidden-print">
          <PrintablePrescription
            template={selectedTemplate}
            prescription={printingPrescription}
            patient={data}
            clinicName={orgDetails?.name || user?.organization?.name || user?.clinicName}
            clinicContact={orgDetails?.phone || user?.organization?.phone || user?.phone}
            clinicEmail={orgDetails?.email || user?.organization?.email || user?.email}
            clinicAddress={
              (() => {
                const addr = orgDetails?.address || user?.organization?.address || user?.organizationId?.address || {};
                const parts = [addr.street, addr.city, addr.state, addr.zipCode || addr.zip].filter(p => p && String(p).trim() !== '');
                return parts.join(', ');
              })()
            }
            clinicLogo={orgDetails?.branding?.logo || orgDetails?.logo || user?.organization?.branding?.logo || user?.organization?.logo}
          />
        </div>
      )}
    </>
  );
};

export default PatientProfile;
