import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddDoctorForm from '../../../Component/Admin/Doctor/AddDoctorForm';
import { centralDoctorApi } from '../../../services/api';
import { toast, ToastContainer } from 'react-toastify';

const AddDoctor = () => {
    const navigate = useNavigate();

    const handleSave = async (submittedData) => {
        try {
            await centralDoctorApi.create(submittedData);
            toast.success('Doctor added successfully!');
            // Small delay to allow toast to be seen before navigation
            setTimeout(() => {
                navigate('/receptionist/doctor');
            }, 1500);
        } catch (error) {
            console.error('Error adding doctor:', error);
            toast.error(error.response?.data?.message || 'Failed to add doctor');
            throw error; // Let the form handle the loading state
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <AddDoctorForm 
                isOpen={true} 
                onClose={() => navigate(-1)} 
                onSave={handleSave} 
            />
            <ToastContainer />
        </div>
    );
};

export default AddDoctor;
