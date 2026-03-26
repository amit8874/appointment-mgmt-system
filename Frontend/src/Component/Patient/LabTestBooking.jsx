import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import labimage from '../../assets/img/lab.png';
import api from '../../services/api';

const LabTestBooking = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Blood Tests');
  const [selectedTests, setSelectedTests] = useState([]);
  const [collectionType, setCollectionType] = useState('home');
  const [address, setAddress] = useState('My Home Address');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('9:00 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample lab tests data organized by category
  const labTests = {
    'Blood Tests': [
      { id: 1, name: 'CBC', price: 300, fasting: 'No', description: 'Complete Blood Count' },
      { id: 2, name: 'Fasting Sugar', price: 200, fasting: 'Yes', description: 'Blood Glucose (Fasting)' },
      { id: 3, name: 'PP Sugar', price: 180, fasting: 'No', description: 'Post Prandial Sugar' },
      { id: 4, name: 'HbA1c', price: 550, fasting: 'No', description: 'Glycated Hemoglobin' },
      { id: 5, name: 'Lipid Profile', price: 650, fasting: '12 hrs', description: 'Cholesterol Panel' },
      { id: 6, name: 'Liver Function', price: 700, fasting: 'No', description: 'LFT Panel' },
      { id: 7, name: 'Kidney Function', price: 600, fasting: 'No', description: 'KFT Panel' },
      { id: 8, name: 'Thyroid Profile', price: 800, fasting: 'No', description: 'T3, T4, TSH' }
    ],
    'Urine Tests': [
      { id: 9, name: 'Urine Routine', price: 150, fasting: 'No', description: 'Complete Urine Analysis' },
      { id: 10, name: 'Urine Culture', price: 400, fasting: 'No', description: 'Bacterial Culture' },
      { id: 11, name: 'Microalbumin', price: 350, fasting: 'No', description: 'Urine Protein Test' }
    ],
    'Imaging': [
      { id: 12, name: 'X-Ray Chest', price: 400, fasting: 'No', description: 'Chest Radiograph' },
      { id: 13, name: 'Ultrasound Abdomen', price: 1200, fasting: '4-6 hrs', description: 'Abdominal Scan' },
      { id: 14, name: 'ECG', price: 300, fasting: 'No', description: 'Electrocardiogram' }
    ],
    'Packages': [
      { id: 15, name: 'Basic Health Check', price: 1500, fasting: '12 hrs', description: 'CBC, LFT, KFT, Lipid, Sugar' },
      { id: 16, name: 'Diabetic Package', price: 2200, fasting: '12 hrs', description: 'Sugar, HbA1c, Lipid, Kidney' },
      { id: 17, name: 'Cardiac Package', price: 2800, fasting: '12 hrs', description: 'Lipid, ECG, Echo, Stress Test' }
    ]
  };

  const categories = Object.keys(labTests);

  const filteredTests = labTests[activeCategory]?.filter(test =>
    test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleTestSelect = (test) => {
    setSelectedTests(prev => {
      const exists = prev.find(t => t.id === test.id);
      if (exists) {
        return prev.filter(t => t.id !== test.id);
      } else {
        return [...prev, test];
      }
    });
  };

  const handleNext = () => {
    if (selectedTests.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      setIsSubmitting(true);
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      const patient = JSON.parse(storedUser);
      
      const requestData = {
        patientId: patient._id || patient.id,
        organizationId: patient.organizationId,
        requestType: 'Lab Test',
        details: {
          tests: selectedTests.map(t => ({ id: t.id, name: t.name, price: t.price })),
          collectionType,
          date: selectedDate,
          time: selectedTime,
          serviceCharge: collectionType === 'home' ? 100 : 0
        },
        address: collectionType === 'home' ? address : 'At Clinic',
        notes: `Lab Test Booking via Patient Panel. Tests: ${selectedTests.map(t=>t.name).join(', ')}`,
        totalAmount: totalAmount + (collectionType === 'home' ? 100 : 0)
      };

      await api.post('/service-requests', requestData);
      
      alert(`Lab tests booking confirmed! ${selectedTests.length} tests scheduled for ${selectedDate} at ${selectedTime}.`);
      navigate('/patient-dashboard');
    } catch (error) {
      console.error('Error booking lab test:', error);
      alert('Error booking lab test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = selectedTests.reduce((sum, test) => sum + test.price, 0);

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
            <span className="mr-3">🧪</span>
            Book Lab Test
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search and select from our comprehensive range of diagnostic tests and health packages.
          </p>
        </div>

        {/* Step 1: Test Selection */}
        <div className="backdrop-blur-sm bg-white/40 rounded-2xl shadow-lg p-8 mb-8">

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search Test: Blood Sugar, CBC, etc."
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Tests Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Test Name</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Fasting</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Select</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => (
                  <tr key={test.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-sm text-gray-500">{test.description}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-semibold text-green-600">₹{test.price}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${test.fasting === 'Yes' || test.fasting === '12 hrs'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {test.fasting}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleTestSelect(test)}
                        className={`w-6 h-6 rounded border-2 transition duration-300 ${selectedTests.find(t => t.id === test.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 hover:border-blue-500'
                          }`}
                      >
                        {selectedTests.find(t => t.id === test.id) && (
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

          {/* Selected Tests Summary */}
          {selectedTests.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-green-900">
                    ✅ Selected: {selectedTests.map(t => t.name).join(', ')}
                  </p>
                  <p className="text-sm text-green-700">
                    Total: ₹{totalAmount}
                  </p>
                </div>
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300"
                >
                  Next → Choose Collection Type
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Collection & Scheduling */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Collection Type & Schedule</h2>

            {/* Collection Type Selection */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  onClick={() => setCollectionType('home')}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition duration-300 ${collectionType === 'home'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center mb-3">
                    <span className="text-3xl mr-3">🏠</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Home Collection</h3>
                      <p className="text-sm text-gray-600">Sample collected at your doorstep</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Additional ₹100 service charge</p>
                </div>

                <div
                  onClick={() => setCollectionType('lab')}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition duration-300 ${collectionType === 'lab'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center mb-3">
                    <span className="text-3xl mr-3">🏥</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Visit Lab</h3>
                      <p className="text-sm text-gray-600">Visit our collection center</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">No additional charges</p>
                </div>
              </div>
            </div>

            {/* Address for Home Collection */}
            {collectionType === 'home' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your address for sample collection"
                />
              </div>
            )}

            {/* Date and Time Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="5:00 PM">5:00 PM</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-300"
              >
                ← Back to Tests
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-300 disabled:bg-green-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Confirming...' : `Confirm & Pay ₹${totalAmount + (collectionType === 'home' ? 100 : 0)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTestBooking;

