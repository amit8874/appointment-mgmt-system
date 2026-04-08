import React from 'react';
import { Building2, FileText, IndianRupee, Clock, Users, MapPin, Hash } from 'lucide-react';

const ClinicInfoTab = ({ organization, onUpdate, loading }) => {
  const [formData, setFormData] = React.useState({
    clinicName: organization?.name || '',
    clinicType: organization?.clinicType || 'General',
    registrationNumber: organization?.registrationNumber || '',
    gstNumber: organization?.gstNumber || '',
    consultationFee: organization?.consultationFee || 0,
    workingHours: {
      start: organization?.settings?.workingHours?.start || '09:00',
      end: organization?.settings?.workingHours?.end || '17:00'
    },
    doctorCapacity: organization?.doctorCapacity || 0,
    address: {
        street: organization?.address?.street || '',
        city: organization?.address?.city || '',
        state: organization?.address?.state || '',
        country: organization?.address?.country || '',
        zipCode: organization?.address?.zipCode || ''
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
        name: formData.clinicName,
        clinicType: formData.clinicType,
        registrationNumber: formData.registrationNumber,
        gstNumber: formData.gstNumber,
        consultationFee: Number(formData.consultationFee),
        doctorCapacity: Number(formData.doctorCapacity),
        settings: {
            ...organization?.settings,
            workingHours: formData.workingHours
        },
        address: formData.address
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Clinic Details</h3>
              <p className="text-xs text-slate-500">Manage your business information and operational settings.</p>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                placeholder="Clinic Name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic Type</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                name="clinicType"
                value={formData.clinicType}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none"
              >
                <option value="General">General</option>
                <option value="Dental">Dental</option>
                <option value="Eye">Eye</option>
                <option value="Skin">Skin</option>
                <option value="Pediatric">Pediatric</option>
                <option value="Pet">Pet</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Number</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                placeholder="Reg. No."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Number <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                placeholder="GSTIN"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation Fee (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number" 
                name="consultationFee"
                value={formData.consultationFee}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                placeholder="Fee"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor Capacity <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number" 
                name="doctorCapacity"
                value={formData.doctorCapacity}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                placeholder="Max Doctors"
              />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/30">
            <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                Working Hours
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                    <input 
                        type="time" 
                        name="workingHours.start"
                        value={formData.workingHours.start}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
                    <input 
                        type="time" 
                        name="workingHours.end"
                        value={formData.workingHours.end}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    />
                </div>
            </div>
        </div>

        <div className="p-8 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600" />
                Clinic Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Street Address</label>
                    <input 
                        type="text" 
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="Street"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">City</label>
                    <input 
                        type="text" 
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="City"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <input 
                        type="text" 
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                        placeholder="State"
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicInfoTab;
