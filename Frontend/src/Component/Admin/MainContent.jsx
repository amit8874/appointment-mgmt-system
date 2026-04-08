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
import MessagesView from './Messaging/MessagesView.jsx';
import IntelligenceHub from './IntelligenceHub.jsx';

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
  onPatientsRefresh,
  patientsTotalItems,
  doctorsCurrentPage,
  doctorsTotalPages,
  onDoctorsPageChange,
  doctorsTotalItems,
  limits,
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
              onSuccess={() => {
                setActiveTab('Appointment Mgmt');
                if (onPatientsRefresh) onPatientsRefresh();
              }} 
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
            totalItems={patientsTotalItems}
            itemsPerPage={15}
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
            totalItems={doctorsTotalItems}
            itemsPerPage={15}
            onPageChange={onDoctorsPageChange}
            limits={limits}
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
            limits={limits}
          />
        );
      case 'Appointment Mgmt':
      case 'Calendar View':
        return (
          <AppointmentTable
            rebookData={rebookData}
          />
        );
      case 'Today Appointment':
        return <TrackAppointmentView />;
      case 'Billing & Payments':
        return <BillingDashboard />;
      case 'Reports & Analytics':
        return <ReportsPanel />;
      case 'Slotify Intelligence':
        return <IntelligenceHub />;
      case 'User Management':
        return <UserManagementPanel limits={limits} />;
      case 'Messages':
        return (
          <div className="p-4 sm:p-6 h-full">
            <MessagesView />
          </div>
        );
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
