import * as XLSX from 'xlsx';

/**
 * Exports patient data to an Excel file.
 * @param {Array} patients - The list of patient objects to export.
 */
export const exportPatientsToExcel = (patients) => {
  if (!patients || patients.length === 0) {
    alert("No data available to export");
    return;
  }

  // Transform data for Excel
  const excelData = patients.map((p) => ({
    "Patient ID": p.patientId || p.id || "-",
    "Full Name": p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || "Unknown",
    "Age": p.age || "-",
    "Gender": p.gender || "-",
    "Phone Number": p.mobile || p.phone || p.contactNumber || p.contact || "-",
    "Email": p.email || "-",
    "Address": `${p.address || ''} ${p.city || ''} ${p.state || ''} ${p.zip || ''}`.trim() || "-",
    "Appointment Date": p.lastVisit || p.date || "-",
    "Payment Status": (p.paymentStatus || p.status || "Pending").toUpperCase(),
    "Assigned Doctor": p.doc || p.assignedDoctor || "Unassigned",
    "Disease/Reason": p.disease || "Not Specified"
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const wscols = [
    { wch: 15 }, // Patient ID
    { wch: 25 }, // Full Name
    { wch: 8 },  // Age
    { wch: 10 }, // Gender
    { wch: 15 }, // Phone Number
    { wch: 25 }, // Email
    { wch: 40 }, // Address
    { wch: 20 }, // Appointment Date
    { wch: 15 }, // Payment Status
    { wch: 20 }, // Assigned Doctor
    { wch: 25 }  // Disease
  ];
  worksheet['!cols'] = wscols;

  // Create workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");

  // Generate filename with current date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Patients_Report_${dateStr}.xlsx`;

  // Download the file
  XLSX.writeFile(workbook, filename);
};
