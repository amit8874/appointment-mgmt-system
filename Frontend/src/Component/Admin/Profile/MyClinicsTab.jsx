import React, { useState, useEffect } from 'react';
import { Building, MapPin, Phone, Mail, Plus, X, Globe, Stethoscope, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-toastify';

const MyClinicsTab = ({ user }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    clinicType: 'General',
    specialist: '',
    subdomain: '',
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/my-clinics');
      if (response.data?.success) {
        setClinics(response.data.clinics || []);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
      toast.error('Failed to load your clinics list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNameChange = (e) => {
    const nameVal = e.target.value;
    const subVal = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      subdomain: subVal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Clinic Name and Business Email are required.');
      return;
    }

    setSubmitLoading(true);
    try {
      const branchPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        clinicType: formData.clinicType,
        specialist: formData.specialist,
        subdomain: formData.subdomain,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: 'India'
        }
      };

      const response = await api.post('/organizations/create-branch', branchPayload);
      if (response.data?.success) {
        toast.success('Clinic branch created successfully!');
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          clinicType: 'General',
          specialist: '',
          subdomain: '',
          street: '',
          city: '',
          state: '',
          zipCode: ''
        });
        fetchClinics();
      }
    } catch (err) {
      console.error('Error creating clinic branch:', err);
      toast.error(err.response?.data?.message || 'Failed to register clinic branch.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-gray-700 pb-5 mb-6 gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Clinic Branches</h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Manage your registered locations and switch clinic views dynamically.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 shrink-0"
        >
          <Plus size={16} />
          Add Second Clinic
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Branches...</p>
        </div>
      ) : clinics.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center">
          <Building className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">No Clinics Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You only have your main clinic registered. Click the button above to add your second branch!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clinics.map((clinic) => {
            const isActive = clinic.id === user?.organizationId;
            return (
              <div
                key={clinic.id}
                className={`relative p-5 rounded-2xl border transition-all ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/10 ring-2 ring-indigo-600/10'
                    : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
              >
                {isActive && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    <CheckCircle2 size={10} />
                    Current Session
                  </span>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Building size={20} />
                  </div>
                  <div className="min-w-0 flex-grow pr-16">
                    <h4 className="font-black text-slate-900 dark:text-white truncate text-base leading-tight">
                      {clinic.name}
                    </h4>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
                      Role: {clinic.role || 'Admin'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-50 dark:border-gray-700/50 pt-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">Slug: <span className="font-black text-slate-800 dark:text-slate-100">{clinic.slug}</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl border border-slate-100 dark:border-gray-700 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-tight">
                  Add Second Clinic Branch
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  Create a new location branch to switch and manage from your admin panel.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Clinic / Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smile Dental Clinic - branch 2"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    placeholder="branch@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Specialty / Clinic Type
                  </label>
                  <select
                    name="clinicType"
                    value={formData.clinicType}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  >
                    <option value="General">General Physician</option>
                    <option value="Dental">Dental / Dentist</option>
                    <option value="Eye">Eye Clinic</option>
                    <option value="Skin">Skin Clinic</option>
                    <option value="Pediatric">Pediatric Clinic</option>
                    <option value="Other">Other Specialty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Subdomain / Slug ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="subdomain"
                      placeholder="clinic-slug"
                      value={formData.subdomain}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Address block */}
                <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-gray-700/50">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <MapPin size={12} /> Address / Location
                  </h4>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    placeholder="123 Main St, Location area"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder=" लखनऊ"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    placeholder="Uttar Pradesh"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Pincode / Zip Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    placeholder="226001"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-bold bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 disabled:opacity-75"
                >
                  {submitLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : 'Register Clinic Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClinicsTab;
