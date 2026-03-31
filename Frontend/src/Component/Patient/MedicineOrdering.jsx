import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import medecineimage from '../../assets/img/medecine.png';
import api, { pharmacyApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  ArrowRight,
  Eye,
  Loader2
} from 'lucide-react';

const MedicineOrdering = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('General');
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('My Home Address');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('2:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
        setIsLoadingPrescriptions(true);
        const data = await pharmacyApi.getPatientPrescriptions();
        setPrescriptions(data);
    } catch (err) {
        console.error("Error fetching prescriptions:", err);
    } finally {
        setIsLoadingPrescriptions(false);
    }
  };

  // Sample medicines data organized by category
  const medicines = {
    'General': [
      { id: 1, name: 'Paracetamol 500mg', generic: 'Acetaminophen', price: 45, strength: '500mg', manufacturer: 'Cipla', prescription: 'No' },
      { id: 2, name: 'Crocin Advance', generic: 'Paracetamol', price: 35, strength: '500mg', manufacturer: 'GSK', prescription: 'No' },
      { id: 3, name: 'Digene', generic: 'Antacid', price: 120, strength: '170ml', manufacturer: 'Abbott', prescription: 'No' },
      { id: 4, name: 'Volini Spray', generic: 'Diclofenac', price: 150, strength: '40g', manufacturer: 'Sun Pharma', prescription: 'No' }
    ],
    'Cardiac': [
      { id: 5, name: 'Amlodipine 5mg', generic: 'Amlodipine', price: 85, strength: '5mg', manufacturer: 'Dr. Reddy\'s', prescription: 'Yes' },
      { id: 6, name: 'Atorvastatin 10mg', generic: 'Atorvastatin', price: 120, strength: '10mg', manufacturer: 'Pfizer', prescription: 'Yes' },
      { id: 7, name: 'Clopidogrel 75mg', generic: 'Clopidogrel', price: 95, strength: '75mg', manufacturer: 'Torrent', prescription: 'Yes' }
    ],
    'Diabetes': [
      { id: 8, name: 'Metformin 500mg', generic: 'Metformin HCl', price: 65, strength: '500mg', manufacturer: 'USV', prescription: 'Yes' },
      { id: 9, name: 'Glimipride 2mg', generic: 'Glimipride', price: 110, strength: '2mg', manufacturer: 'Sanofi', prescription: 'Yes' },
      { id: 10, name: 'Insulin Regular', generic: 'Human Insulin', price: 450, strength: '100IU/ml', manufacturer: 'Novo Nordisk', prescription: 'Yes' }
    ],
    'Antibiotics': [
      { id: 11, name: 'Azithromycin 500mg', generic: 'Azithromycin', price: 180, strength: '500mg', manufacturer: 'Macleods', prescription: 'Yes' },
      { id: 12, name: 'Amoxicillin 500mg', generic: 'Amoxicillin', price: 120, strength: '500mg', manufacturer: 'Alkem', prescription: 'Yes' },
      { id: 13, name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin', price: 95, strength: '500mg', manufacturer: 'Bayer', prescription: 'Yes' }
    ],
    'Vitamins': [
      { id: 14, name: 'Vitamin D3 60K', generic: 'Cholecalciferol', price: 150, strength: '60,000 IU', manufacturer: 'Sun Pharma', prescription: 'No' },
      { id: 15, name: 'Vitamin B Complex', generic: 'B Vitamins', price: 85, strength: 'Various', manufacturer: 'Abbott', prescription: 'No' },
      { id: 16, name: 'Calcium 500mg', generic: 'Calcium Carbonate', price: 120, strength: '500mg', manufacturer: 'Pfizer', prescription: 'No' }
    ]
  };

  const categories = Object.keys(medicines);

  const filteredMedicines = medicines[activeCategory]?.filter(medicine =>
    medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.generic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleMedicineSelect = (medicine) => {
    setSelectedMedicines(prev => {
      const exists = prev.find(m => m.id === medicine.id);
      if (exists) {
        return prev.filter(m => m.id !== medicine.id);
      } else {
        return [...prev, { ...medicine, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (medicineId, newQuantity) => {
    if (newQuantity === 0) {
      setSelectedMedicines(prev => prev.filter(m => m.id !== medicineId));
    } else {
      setSelectedMedicines(prev =>
        prev.map(m => m.id === medicineId ? { ...m, quantity: newQuantity } : m)
      );
    }
  };

  const handleNext = () => {
    if (selectedMedicines.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleConfirmOrder = async () => {
    try {
      setIsSubmitting(true);
      const total = selectedMedicines.reduce((sum, med) => sum + (med.price * med.quantity), 0);
      
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      const patient = JSON.parse(storedUser);
      
      const requestData = {
        patientId: patient._id || patient.id,
        organizationId: patient.organizationId,
        requestType: 'Medicine',
        details: {
          medicines: selectedMedicines.map(m => ({ id: m.id, name: m.name, quantity: m.quantity, price: m.price })),
          deliveryDate,
          deliveryTime,
        },
        address: deliveryAddress,
        notes: `Medicine Order via Patient Panel. Items: ${selectedMedicines.map(m=>`${m.name} (x${m.quantity})`).join(', ')}`,
        totalAmount: total
      };

      await api.post('/service-requests', requestData);

      alert(`Medicine order confirmed! ${selectedMedicines.length} items (Total: ₹${total}) will be delivered on ${deliveryDate} at ${deliveryTime}.`);
      navigate('/patient-dashboard');
    } catch (error) {
      console.error('Error ordering medicine:', error);
      alert('Error ordering medicine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPrescription = async (id) => {
    try {
        setConfirmingId(id);
        await pharmacyApi.confirmPrescriptionOrder(id);
        alert("Order confirmed and paid! Your medicine will be delivered soon.");
        fetchPrescriptions();
    } catch (err) {
        alert(err.response?.data?.message || "Payment failed");
    } finally {
        setConfirmingId(null);
    }
  };

  const totalAmount = selectedMedicines.reduce((sum, med) => sum + (med.price * med.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
            <span className="mr-3">💊</span>
            Order Medicines
          </h1>
          <div className='backdrop-blur'>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Order prescription and over-the-counter medicines from licensed pharmacies with fast delivery.
            </p>
          </div>
        </div>

        {/* Prescription Quotes Section */}
        {prescriptions.length > 0 && (
            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                            <FileText size={20} />
                        </span>
                        Prescription Quotes
                    </h2>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 italic">
                        Real-time pricing from pharmacies
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {prescriptions.map((pres) => (
                            <motion.div 
                                key={pres._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden"
                            >
                                <div className="flex p-6 gap-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shrink-0 group relative cursor-pointer">
                                        <img src={pres.prescriptionUrl} className="w-full h-full object-cover" alt="Prescription" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye size={20} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-black text-slate-900 truncate uppercase text-sm">{pres.pharmacyId?.name || 'Searching...'}</h3>
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                pres.status === 'quoted' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                pres.status === 'accepted' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                                {pres.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 mb-4">
                                            {typeof pres.pharmacyId?.address === 'object' 
                                                ? `${pres.pharmacyId.address.street}, ${pres.pharmacyId.address.city}` 
                                                : pres.pharmacyId?.address || 'Awaiting response'}
                                        </p>
                                        
                                        {pres.status === 'quoted' ? (
                                            <div className="space-y-4">
                                                <div className="bg-slate-50 rounded-2xl p-4">
                                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200/50">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quote Summary</span>
                                                        <span className="font-black text-slate-900 text-lg">₹{pres.quotedTotal}</span>
                                                    </div>
                                                    <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                                        {pres.quotedItems.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-[11px] mb-1">
                                                                <span className="font-bold text-slate-600 truncate mr-2">{item.productId?.name} x{item.quantity}</span>
                                                                <span className="font-black text-slate-800 shrink-0">₹{item.price * item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleConfirmPrescription(pres._id)}
                                                    disabled={confirmingId === pres._id}
                                                    className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                                                >
                                                    {confirmingId === pres._id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                                                    Confirm & Pay
                                                </button>
                                            </div>
                                        ) : pres.status === 'accepted' ? (
                                            <div className="py-4 px-6 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3">
                                                <Clock size={16} className="text-orange-500 animate-pulse" />
                                                <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Pharmacy is preparing quote...</p>
                                            </div>
                                        ) : pres.status === 'paid' ? (
                                            <div className="py-4 px-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Order Confirmed & Paid</p>
                                            </div>
                                        ) : (
                                            <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                                <Loader2 size={16} className="text-slate-400 animate-spin" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finding nearby pharmacies...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        )}

        {/* Step 1: Medicine Selection */}
        <div className="backdrop-blur bg-white/50 rounded-2xl shadow-lg p-8 mb-8">

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search Medicine: Paracetamol, Metformin, etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition duration-300 ${activeCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Medicines Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Medicine Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Strength</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Prescription</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Select</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((medicine) => (
                  <tr key={medicine.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{medicine.name}</p>
                        <p className="text-sm text-gray-500">{medicine.generic} • {medicine.manufacturer}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-700">{medicine.strength}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-semibold text-green-600">₹{medicine.price}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${medicine.prescription === 'Yes'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {medicine.prescription}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleMedicineSelect(medicine)}
                        className={`w-6 h-6 rounded border-2 transition duration-300 ${selectedMedicines.find(m => m.id === medicine.id)
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300 hover:border-green-500'
                          }`}
                      >
                        {selectedMedicines.find(m => m.id === medicine.id) && (
                          <svg className="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Medicines Summary */}
          {selectedMedicines.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3">Selected Medicines</h3>
              <div className="space-y-2 mb-4">
                {selectedMedicines.map((medicine) => (
                  <div key={medicine.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{medicine.name}</p>
                      <p className="text-sm text-gray-500">{medicine.strength}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(medicine.id, medicine.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{medicine.quantity}</span>
                        <button
                          onClick={() => updateQuantity(medicine.id, medicine.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold text-green-600">₹{medicine.price * medicine.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-green-200">
                <span className="text-lg font-semibold text-green-900">Total: ₹{totalAmount}</span>
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300"
                >
                  Next → Delivery Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Delivery & Confirmation */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Details & Confirmation</h2>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                {selectedMedicines.map((medicine) => (
                  <div key={medicine.id} className="flex justify-between items-center">
                    <span className="text-gray-700">{medicine.name} × {medicine.quantity}</span>
                    <span className="font-medium text-gray-900">₹{medicine.price * medicine.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your complete delivery address"
              />
            </div>

            {/* Delivery Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time Slot
                </label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9:00 AM - 12:00 PM">9:00 AM - 12:00 PM</option>
                  <option value="12:00 PM - 3:00 PM">12:00 PM - 3:00 PM</option>
                  <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM</option>
                  <option value="6:00 PM - 9:00 PM">6:00 PM - 9:00 PM</option>
                </select>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">💳 Payment Information</h3>
              <p className="text-sm text-blue-700">
                Payment will be collected upon delivery. We accept Cash, UPI, and Card payments.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-300"
              >
                ← Back to Medicines
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-300 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Confirming...' : `Confirm Order ₹${totalAmount}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicineOrdering;

