import React from 'react';
import { X, User } from 'lucide-react';

const DoctorProfileModal = ({
  selectedDoctor,
  setSelectedDoctor,
  handleEditDoctorFromProfile,
  handleDeleteDoctorFromProfile
}) => {
  if (!selectedDoctor) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Doctor Profile</h2>
          <button
            onClick={() => setSelectedDoctor(null)}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDoctor.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedDoctor.specialization}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <p className="text-gray-900 dark:text-white">{selectedDoctor.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <p className="text-gray-900 dark:text-white">{selectedDoctor.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Experience</label>
              <p className="text-gray-900 dark:text-white">{selectedDoctor.experience} years</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consultation Fee</label>
              <p className="text-gray-900 dark:text-white">₹{selectedDoctor.consultationFee}</p>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => handleEditDoctorFromProfile(selectedDoctor)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => handleDeleteDoctorFromProfile(selectedDoctor.id)}
              className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileModal;
