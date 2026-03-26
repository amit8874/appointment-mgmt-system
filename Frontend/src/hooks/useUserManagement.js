import { useState, useCallback } from 'react';
import { userApi } from '../services/api';

export const useUserManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setAdminsLoading(true);
      const data = await userApi.getAdmins();
      setAdmins(data);
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setAdminsLoading(false);
    }
  }, []);

  // Create admin
  const handleCreateAdmin = useCallback(async (adminData) => {
    try {
      if (editingAdmin) {
        await userApi.updateAdmin(editingAdmin.id, adminData);
        setAdmins(prev =>
          prev.map(admin =>
            admin.id === editingAdmin.id ? { ...admin, ...adminData } : admin
          )
        );
      } else {
        const newAdmin = await userApi.createAdmin(adminData);
        setAdmins(prev => [...prev, newAdmin]);
      }
      setShowAdminForm(false);
      setEditingAdmin(null);
    } catch (error) {
      alert(error.message || 'Failed to save admin');
    }
  }, [editingAdmin]);

  // Delete admin
  const handleDeleteAdmin = useCallback(async (adminId) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        await userApi.deleteAdmin(adminId);
        setAdmins(prev => prev.filter(admin => admin.id !== adminId));
      } catch (error) {
        alert(error.message || 'Failed to delete admin');
      }
    }
  }, []);

  // Edit admin
  const handleEditAdmin = useCallback((admin) => {
    setEditingAdmin(admin);
    setShowAdminForm(true);
  }, []);

  return {
    admins,
    adminsLoading,
    showAdminForm,
    setShowAdminForm,
    editingAdmin,
    setEditingAdmin,
    fetchAdmins,
    handleCreateAdmin,
    handleDeleteAdmin,
    handleEditAdmin,
  };
};
