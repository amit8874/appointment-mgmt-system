import React from 'react';
import { X, UserCircle } from 'lucide-react';

const PatientProfileModal = ({
  selectedPatient,
  setSelectedPatient
}) => {
  if (!selectedPatient) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <UserCircle className="w-6 h-6 mr-2 text-blue-600" />
            Patient Details
          </h2>
          <button
            onClick={() => setSelectedPatient(null)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.patientId || selectedPatient._id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.name || selectedPatient.fullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.age || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.contact || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile No.</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.mobile || selectedPatient.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedPatient.address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setSelectedPatient(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfileModal;
