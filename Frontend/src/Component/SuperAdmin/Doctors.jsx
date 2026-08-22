import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';
import { 
  Stethoscope, 
  Building2, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  FileCheck, 
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Fingerprint,
  IndianRupee,
  Briefcase,
  Plus,
  Copy,
  ExternalLink,
  Check,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCardSkeleton } from '../../components/Shared/DashboardSkeletons';
import { DoctorCardSkeleton } from '../../components/Shared/DoctorSkeletons';

const Doctors = () => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getOrganizations({ limit: 100 });
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = async (org) => {
    setSelectedOrg(org);
    setDoctorsLoading(true);
    try {
      const data = await superAdminApi.getOrganizationDoctors(org._id);
      setDoctors(data || []);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleVerifyDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to verify this doctor?')) return;
    try {
      await superAdminApi.verifyDoctorSuperAdmin(doctorId);
      // Refresh doctor list
      const data = await superAdminApi.getOrganizationDoctors(selectedOrg._id);
      setDoctors(data || []);
      if (selectedDoctor && selectedDoctor._id === doctorId) {
        setSelectedDoctor({ ...selectedDoctor, status: 'Verified' });
      }
    } catch (err) {
      alert('Verification failed: ' + err.message);
    }
  };

  const handleRejectDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to reject this doctor registration?')) return;
    try {
      await superAdminApi.rejectDoctorSuperAdmin(doctorId);
      // Refresh doctor list
      const data = await superAdminApi.getOrganizationDoctors(selectedOrg._id);
      setDoctors(data || []);
      if (selectedDoctor && selectedDoctor._id === doctorId) {
        setSelectedDoctor({ ...selectedDoctor, status: 'Rejected' });
      }
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    }
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.doctorId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusBadge = ({ status }) => {
    const getColors = () => {
      switch (status) {
        case 'Verified':
        case 'Active':
          return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Pending':
          return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'Rejected':
          return 'bg-rose-100 text-rose-800 border-rose-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getColors()}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const DoctorDetailModal = ({ doctor, onClose }) => {
    if (!doctor) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Stethoscope size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Comprehensive Doctor Profile</h2>
                <p className="text-xs text-gray-500 font-medium">Reviewing details for {doctor.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
              <XCircle size={24} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Profile Summary */}
              <div className="lg:col-span-1 space-y-6">
                <div className="text-center p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
                  <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden border-4 border-white shadow-xl mb-4 bg-gray-100">
                    {doctor.photo ? (
                      <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <User size={64} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
                  <p className="text-sm font-semibold text-indigo-600 mb-2">{doctor.specialization}</p>
                  <StatusBadge status={doctor.status} />
                  
                  <div className="mt-6 pt-6 border-t border-indigo-100 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-gray-400">Experience</p>
                      <p className="text-sm font-bold text-gray-700">{doctor.experience || 0} Yrs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-gray-400">Fee</p>
                      <p className="text-sm font-bold text-gray-700">₹{doctor.consultationFee || doctor.fee}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Actions */}
                {doctor.status === 'Pending' && (
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Administrative Actions</h4>
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleVerifyDoctor(doctor._id)}
                        className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} /> Verify & Activate
                      </button>
                      <button 
                        onClick={() => handleRejectDoctor(doctor._id)}
                        className="w-full py-3 bg-white text-rose-600 border border-rose-100 rounded-2xl font-bold text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} /> Reject Registration
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Columns - Detailed Data */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Personal & Contact Section */}
                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                    <User size={16} /> Personal & Contact Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <DetailBlock label="Full Name" value={doctor.name} />
                    <DetailBlock label="Doctor ID" value={doctor.doctorId} />
                    <DetailBlock label="Email Address" value={doctor.email} icon={Mail} />
                    <DetailBlock label="Mobile Phone" value={doctor.phone} icon={Phone} />
                    <DetailBlock label="Gender" value={doctor.gender} />
                    <DetailBlock label="Date of Birth" value={doctor.dob ? new Date(doctor.dob).toLocaleDateString() : 'N/A'} icon={Calendar} />
                    <div className="col-span-2">
                      <DetailBlock label="Residential Address" value={doctor.address || 'N/A'} icon={MapPin} />
                    </div>
                  </div>
                </section>

                {/* Professional Section */}
                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-sky-600 mb-4 flex items-center gap-2">
                    <Award size={16} /> Professional Background
                  </h4>
                  <div className="grid grid-cols-2 gap-6 bg-sky-50/50 rounded-3xl p-6 border border-sky-100/50">
                    <DetailBlock label="Specialization" value={doctor.specialization} />
                    <DetailBlock label="Qualification" value={doctor.qualification} />
                    <DetailBlock label="Department" value={doctor.department || 'General Medicine'} />
                    <DetailBlock label="Medical Council" value={doctor.medicalCouncil || doctor.registrationCouncil || 'N/A'} />
                    <DetailBlock label="License / Reg Number" value={doctor.licenseNumber || doctor.registrationNumber || 'N/A'} />
                    <DetailBlock label="Registration Year" value={doctor.registrationYear || 'N/A'} />
                  </div>
                </section>



                {/* Availability Section */}
                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                    <Clock size={16} /> Schedule & Availability
                  </h4>
                  <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <div key={day} className="flex items-center gap-2">
                          {doctor.availability?.[day] ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <XCircle size={14} className="text-rose-500" />
                          )}
                          <span className="text-xs font-bold capitalize text-gray-700">{day}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-white rounded-2xl border border-orange-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-orange-500" />
                        <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Working Hours</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">
                        {doctor.workingHours?.start || '09:00'} - {doctor.workingHours?.end || '17:00'}
                      </span>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const DetailBlock = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</span>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-gray-400" />}
        <span className="text-sm font-bold text-gray-800">{value || 'N/A'}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumbs / Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {selectedOrg && (
              <button 
                onClick={() => setSelectedOrg(null)}
                className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {selectedOrg ? `Doctors in ${selectedOrg.name}` : 'Central Doctor Directory'}
              </h1>
              <p className="text-slate-500 font-medium">
                {selectedOrg ? 'Review and manage specific practitioners' : 'Manage registered doctors across all clinic organizations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsCreateModalOpen(true)}
               className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 shrink-0"
             >
               <Plus size={16} /> Create Doctor Profile
             </button>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={selectedOrg ? "Search doctors..." : "Search organizations..."}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-64 shadow-sm"
                  value={selectedOrg ? searchTerm : orgSearchTerm}
                  onChange={(e) => selectedOrg ? setSearchTerm(e.target.value) : setOrgSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedOrg ? (
            <motion.div 
              key="org-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(i => <StatCardSkeleton key={i} />)
              ) : filteredOrgs.map(org => (
                <div 
                  key={org._id}
                  onClick={() => handleSelectOrg(org)}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="text-indigo-600" size={24} />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors animate-pulse-subtle">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{org.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{org.subdomain}.Oviaan.in</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Email</span>
                      <span className="text-slate-700 font-semibold">{org.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Status</span>
                      <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] ${
                        org.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {org.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredOrgs.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center">
                   <div className="bg-slate-200/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <Building2 size={40} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800">No organizations found</h3>
                   <p className="text-slate-500">Try adjusting your search query</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="doctor-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {doctorsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => <DoctorCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map(doctor => (
                    <div 
                      key={doctor._id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white bg-slate-50 flex-shrink-0">
                            {doctor.photo ? (
                              <img src={doctor.photo} alt={doctor.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <User size={40} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <StatusBadge status={doctor.status} />
                              <span className="text-[10px] font-black text-slate-400">{doctor.doctorId}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 truncate">{doctor.name}</h3>
                            <p className="text-xs font-bold text-indigo-600 mb-3">{doctor.specialization}</p>
                            
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                               <div className="flex items-center gap-1">
                                  <Briefcase size={12} />
                                  {doctor.experience} Yrs
                               </div>
                               <div className="flex items-center gap-1 text-emerald-600">
                                  <IndianRupee size={12} />
                                  {doctor.consultationFee || doctor.fee}
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                         <button 
                          onClick={() => setSelectedDoctor(doctor)}
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                         >
                            <Eye size={14} /> Full Details
                         </button>
                         {doctor.status === 'Pending' && (
                           <div className="flex gap-2">
                             <button 
                               onClick={() => handleVerifyDoctor(doctor._id)}
                               className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                               title="Verify Immediately"
                             >
                                <CheckCircle2 size={16} />
                             </button>
                             <button 
                               onClick={() => handleRejectDoctor(doctor._id)}
                               className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                               title="Reject Registration"
                             >
                                <XCircle size={16} />
                             </button>
                           </div>
                         )}
                      </div>
                    </div>
                  ))}
                  {filteredDoctors.length === 0 && (
                     <div className="col-span-full py-20 text-center">
                        <div className="bg-slate-200/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-slate-400">
                           <Stethoscope size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No doctors registered</h3>
                        <p className="text-slate-500">This organization has not added any practitioners yet</p>
                     </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedDoctor && (
            <DoctorDetailModal 
              doctor={selectedDoctor} 
              onClose={() => setSelectedDoctor(null)} 
            />
          )}
        </AnimatePresence>

        {/* Create Public Doctor Profile Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <CreateDoctorModal 
              isOpen={isCreateModalOpen} 
              onClose={() => setIsCreateModalOpen(false)} 
              organizations={organizations}
              onDoctorCreated={() => {
                if (selectedOrg) handleSelectOrg(selectedOrg);
              }}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

const CreateDoctorModal = ({ isOpen, onClose, organizations, onDoctorCreated }) => {
  const [createFormData, setCreateFormData] = useState({
    name: '',
    photo: '',
    specialization: 'General Physician',
    qualification: 'MBBS',
    experience: 5,
    clinicName: '',
    address: '',
    city: 'Lucknow',
    fee: 500,
    phone: '',
    email: '',
    about: '',
    organizationId: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successProfile, setSuccessProfile] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.name || !createFormData.specialization) {
      alert('Doctor Name and Specialization are required.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await superAdminApi.createPublicDoctorProfile(createFormData);
      const fullUrl = `${window.location.origin}${res.publicUrl}`;
      setSuccessProfile({
        name: res.doctor.name,
        slug: res.slug,
        fullUrl: fullUrl,
        specialization: res.doctor.specialization,
        clinicName: res.doctor.clinicName,
        photo: res.doctor.photo
      });
      if (onDoctorCreated) onDoctorCreated();
    } catch (err) {
      console.error('Error creating public doctor profile:', err);
      alert(err.response?.data?.message || 'Failed to create doctor profile');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center text-indigo-300">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create Public Doctor Profile</h2>
              <p className="text-xs text-indigo-200">Visible on website & indexed by Google search</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
            <XCircle size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {successProfile ? (
            <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Doctor Profile Published!</h3>
                <p className="text-slate-500 text-sm mt-1">Profile for <span className="font-bold text-indigo-600">{successProfile.name}</span> is live and searchable.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">Public Doctor Profile Link</span>
                <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                  <input 
                    type="text" 
                    readOnly 
                    value={successProfile.fullUrl} 
                    className="flex-1 text-xs font-bold text-slate-700 outline-none bg-transparent"
                  />
                  <button
                    onClick={() => copyToClipboard(successProfile.fullUrl)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <a 
                  href={successProfile.fullUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <ExternalLink size={16} /> View Public Profile Page
                </a>
                <button
                  onClick={() => {
                    setSuccessProfile(null);
                    onClose();
                  }}
                  className="px-6 py-3 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Doctor Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Dr. Rajiv Sharma"
                    value={createFormData.name}
                    onChange={e => setCreateFormData({...createFormData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Specialization *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Cardiologist, Dentist, Physician"
                    value={createFormData.specialization}
                    onChange={e => setCreateFormData({...createFormData, specialization: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Qualification</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MBBS, MD, BDS, MDS"
                    value={createFormData.qualification}
                    onChange={e => setCreateFormData({...createFormData, qualification: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Years of Experience</label>
                  <input 
                    type="number" 
                    min="0"
                    value={createFormData.experience}
                    onChange={e => setCreateFormData({...createFormData, experience: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Clinic / Hospital Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Aarogyam Medical Center"
                    value={createFormData.clinicName}
                    onChange={e => setCreateFormData({...createFormData, clinicName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">City / Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lucknow, Delhi, Mumbai"
                    value={createFormData.city}
                    onChange={e => setCreateFormData({...createFormData, city: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Full Clinic Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 22 Brahmpuri, Near Jugauli Crossing, Indira Nagar, Lucknow"
                    value={createFormData.address}
                    onChange={e => setCreateFormData({...createFormData, address: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Consultation Fee (₹)</label>
                  <input 
                    type="number" 
                    placeholder="500"
                    value={createFormData.fee}
                    onChange={e => setCreateFormData({...createFormData, fee: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Direct Phone / Mobile</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 9876543210"
                    value={createFormData.phone}
                    onChange={e => setCreateFormData({...createFormData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Profile Photo URL</label>
                  <input 
                    type="url" 
                    placeholder="https://... (Leave blank for default avatar)"
                    value={createFormData.photo}
                    onChange={e => setCreateFormData({...createFormData, photo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">About Doctor / Biography</label>
                  <textarea 
                    rows="3"
                    placeholder="Describe doctor background, achievements, treatment focus..."
                    value={createFormData.about}
                    onChange={e => setCreateFormData({...createFormData, about: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Associate Organization (Optional)</label>
                  <select
                    value={createFormData.organizationId}
                    onChange={e => setCreateFormData({...createFormData, organizationId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Default Oviaan Platform Doctor</option>
                    {organizations.map(org => (
                      <option key={org._id} value={org._id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {submitting && <Loader2 className="animate-spin" size={14} />}
                  Publish Doctor Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Doctors;
