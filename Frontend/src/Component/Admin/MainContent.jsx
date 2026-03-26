import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PatientPanel from './Patient/PatientPanel.jsx';
import DoctorPanel from './Doctor/DoctorPanel.jsx';
import ReceptionistPanel from './Receptionist/ReceptionistPanel.jsx';
import AppointmentManagement from './AppointmentMgmt/AppointmentManagment.jsx';
import AppointmentTable from './AppointmentMgmt/AppointmentTable.jsx';
import BillingDashboard from './Billing/BillingDashboard.jsx';
import UserManagementPanel from './UserManagementPanel.jsx';
import ReportsPanel from './ReportsPanel.jsx';
import AdminDashboardPanel from './AdminDashboardPanel.jsx';
import PatientProfileModal from './PatientProfileModal.jsx';
import DoctorProfileModal from './DoctorProfileModal.jsx';
import AdminDoctorSchedule from './Doctor/AdminDoctorSchedule.jsx';

const MainContent = ({
  activeTab,
  setActiveTab,
  selectedPatient,
  setSelectedPatient,
  rebookData,
  setRebookData,
  patients,
  patientsLoading,
  patientsError,
  handleViewPatient,
  openPatientForm,
  doctors,
  doctorsLoading,
  doctorsError,
  handleViewDoctor,
  handleEditDoctor,
  handleDeleteDoctor,
  openDoctorForm,
  receptionists,
  receptionistsLoading,
  receptionistsError,
  openReceptionistForm,
  handleDeleteReceptionist,
  stats,
  timeRange,
  setTimeRange,
  selectedDoctorFilter,
  setSelectedDoctorFilter,
  openModal,
  appointmentTrendsData,
  revenueByDoctorData,
  monthlyIncomeExpenseData,
  selectedDoctor,
  setSelectedDoctor,
  handleEditDoctorFromProfile,
  handleDeleteDoctorFromProfile,
  refreshDoctors,
}) => {
  const content = useMemo(() => {
    if (selectedPatient) {
      return (
        <PatientProfileModal
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
        />
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <AdminDashboardPanel
            stats={stats}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            selectedDoctorFilter={selectedDoctorFilter}
            setSelectedDoctorFilter={setSelectedDoctorFilter}
            doctors={doctors}
            openModal={openModal}
            openPatientForm={openPatientForm}
            openDoctorForm={openDoctorForm}
            openReceptionistForm={openReceptionistForm}
            appointmentTrendsData={appointmentTrendsData}
            revenueByDoctorData={revenueByDoctorData}
            monthlyIncomeExpenseData={monthlyIncomeExpenseData}
          />
        );
      case 'Patients':
        return (
          <PatientPanel
            patients={patients}
            patientsLoading={patientsLoading}
            patientsError={patientsError}
            onViewPatient={handleViewPatient}
            onAddPatient={() => openPatientForm()}
            setActiveTab={setActiveTab}
            setRebookData={setRebookData}
          />
        );
      case 'Doctor':
        return (
          <DoctorPanel
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            doctorsError={doctorsError}
            onViewDoctor={handleViewDoctor}
            onEditDoctor={handleEditDoctor}
            onDeleteDoctor={handleDeleteDoctor}
            onAddDoctor={openDoctorForm}
            refreshDoctors={refreshDoctors}
          />
        );
      case 'Doctor Schedule':
        return (
          <AdminDoctorSchedule
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            doctorsError={doctorsError}
          />
        );
      case 'Receptionist':
        return (
          <ReceptionistPanel
            receptionists={receptionists}
            receptionistsLoading={receptionistsLoading}
            receptionistsError={receptionistsError}
            openReceptionistForm={openReceptionistForm}
            onViewReceptionist={(receptionist) => { }}
            onEditReceptionist={openReceptionistForm}
            onDeleteReceptionist={handleDeleteReceptionist}
            refreshReceptionists={() => { }}
          />
        );
      case 'Appointment Mgmt':
        return (
          <AppointmentManagement
            rebookData={rebookData}
          />
        );
      case 'Billing & Payments':
        return <BillingDashboard />;
      case 'Reports & Analytics':
        return <ReportsPanel />;
      case 'User Management':
        return <UserManagementPanel />;
      default:
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Select a section from the sidebar.</div>;
    }
  }, [
    activeTab,
    setActiveTab,
    selectedPatient,
    setSelectedPatient,
    patients,
    patientsLoading,
    patientsError,
    handleViewPatient,
    openPatientForm,
    doctors,
    doctorsLoading,
    doctorsError,
    handleViewDoctor,
    handleEditDoctor,
    handleDeleteDoctor,
    openDoctorForm,
    receptionists,
    receptionistsLoading,
    receptionistsError,
    openReceptionistForm,
    handleDeleteReceptionist,
    stats,
    timeRange,
    setTimeRange,
    selectedDoctorFilter,
    setSelectedDoctorFilter,
    openModal,
    appointmentTrendsData,
    revenueByDoctorData,
    monthlyIncomeExpenseData,
  ]);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {content}
        </motion.div>
      </AnimatePresence>
      <DoctorProfileModal
        selectedDoctor={selectedDoctor}
        setSelectedDoctor={setSelectedDoctor}
        handleEditDoctorFromProfile={handleEditDoctorFromProfile}
        handleDeleteDoctorFromProfile={handleDeleteDoctorFromProfile}
      />
    </>
  );
};

export default MainContent;
