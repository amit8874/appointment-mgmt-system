import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HorizontalAppointmentForm from './HorizontalAppointmentForm';
import DoctorPanel from './Doctor/DoctorPanel.jsx';
import ReceptionistPanel from './Receptionist/ReceptionistPanel.jsx';
import AppointmentManagement from './AppointmentMgmt/AppointmentManagment.jsx';
import TrackAppointmentView from './AppointmentMgmt/TrackAppointmentView.jsx';
import AppointmentTable from './AppointmentMgmt/AppointmentTable.jsx';
import BillingDashboard from './Billing/BillingDashboard.jsx';
import UserManagementPanel from './UserManagementPanel.jsx';
import ReportsPanel from './ReportsPanel.jsx';
import AdminDashboardPanel from './AdminDashboardPanel.jsx';
import PatientProfileModal from './PatientProfileModal.jsx';
import DoctorProfileModal from './DoctorProfileModal.jsx';
import AdminDoctorSchedule from './Doctor/AdminDoctorSchedule.jsx';
import PatientPanel from './Patient/PatientPanel.jsx';

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
  onVerifyDoctor,
  onRejectDoctor,
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
  // Pagination Props
  patientsCurrentPage,
  patientsTotalPages,
  onPatientsPageChange,
  doctorsCurrentPage,
  doctorsTotalPages,
  onDoctorsPageChange,
  recentAppointments = []
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
      case 'New Appointment':
        return (
          <div className="p-6">
            <HorizontalAppointmentForm 
              doctors={doctors} 
              onSuccess={() => setActiveTab('Appointment Mgmt')} 
              openDoctorForm={openDoctorForm} 
              initialData={rebookData}
            />
          </div>
        );
      case 'Analysis':
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
            recentAppointments={recentAppointments}
            hideForm={true}
          />
        );
      case 'Patients':
        return (
          <PatientPanel
            patients={patients}
            patientsLoading={patientsLoading}
            patientsError={patientsError}
            onViewPatient={handleViewPatient}
            onAddPatient={openPatientForm}
            setActiveTab={setActiveTab}
            setRebookData={setRebookData}
            currentPage={patientsCurrentPage}
            totalPages={patientsTotalPages}
            onPageChange={onPatientsPageChange}
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
            onVerifyDoctor={onVerifyDoctor}
            onRejectDoctor={onRejectDoctor}
            refreshDoctors={refreshDoctors}
            currentPage={doctorsCurrentPage}
            totalPages={doctorsTotalPages}
            onPageChange={onDoctorsPageChange}
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
      case 'Calendar View':
        return (
          <AppointmentManagement
            rebookData={rebookData}
          />
        );
      case 'Track Appointment':
        return <TrackAppointmentView />;
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
    recentAppointments,
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
