import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { centralDoctorApi, patientApi } from '../../services/api';

const InvoiceTemplate = ({ invoiceData = {}, clinicInfo = {}, template = null }) => {
    const {
        billId,
        date,
        patientName = 'Walk-in Patient',
        patientId = 'N/A',
        doctorName = 'N/A',
        items = [],
        notes = '',
        paymentMethod = 'N/A',
        status = 'Paid',
        installments = []
    } = invoiceData;

    // Financial fallback resolution
    const total = Number(invoiceData.total ?? invoiceData.amount ?? 0);
    const subtotal = Number(invoiceData.subtotal ?? invoiceData.grossAmount ?? total ?? 0);
    const paidAmount = Number(invoiceData.paidAmount ?? invoiceData.paid ?? total ?? 0);
    const dueAmount = Number(invoiceData.dueAmount ?? Math.max(0, total - paidAmount));

    const [doctorDetails, setDoctorDetails] = useState(null);

    useEffect(() => {
        const fetchDoctor = async () => {
            if (!doctorName || doctorName === 'N/A') return;
            try {
                if (invoiceData.doctorId && invoiceData.doctorId !== 'N/A') {
                    const doc = await centralDoctorApi.getById(invoiceData.doctorId);
                    if (doc) {
                        setDoctorDetails(doc);
                        return;
                    }
                }
                const response = await centralDoctorApi.getAll();
                const docsList = response?.doctors || (Array.isArray(response) ? response : []);
                const match = docsList.find(d => 
                    d.name?.toLowerCase().includes(doctorName.toLowerCase()) || 
                    `${d.firstName} ${d.lastName}`.toLowerCase().includes(doctorName.toLowerCase())
                );
                if (match) {
                    setDoctorDetails(match);
                }
            } catch (e) {
                console.error("Error fetching doctor in InvoiceTemplate:", e);
            }
        };
        fetchDoctor();
    }, [invoiceData.doctorId, doctorName]);

    const [patientDetails, setPatientDetails] = useState(null);

    useEffect(() => {
        const fetchPatient = async () => {
            if (!patientId || patientId === 'N/A' || patientId === 'Walk-in Patient' || patientId === '000000') return;
            try {
                const res = await patientApi.getByPatientId(patientId);
                if (res) {
                    setPatientDetails(res);
                }
            } catch (e) {
                console.error("Error fetching patient in InvoiceTemplate:", e);
            }
        };
        fetchPatient();
    }, [patientId]);

    const formatAddress = (addr) => {
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
        return parts.join(', ');
    };

    const rawClinicName = String(clinicInfo.branding?.clinicName || clinicInfo.clinicName || clinicInfo.name || 'Manomay Dental Care');
    const parsedClinic = (() => {
        const match = rawClinicName.match(/\(([^)]+)\)/);
        if (match) {
            const subtitle = match[1].trim();
            const name = rawClinicName.replace(/\([^)]+\)/, '').trim();
            return { name, subtitle };
        }
        return { name: rawClinicName.trim(), subtitle: clinicInfo.branding?.clinicSubtitle || '' };
    })();

    const cleanClinicName = parsedClinic.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const fallbackWebsite = `www.${cleanClinicName}.in`;

    const info = {
        ...clinicInfo,
        name: parsedClinic.name,
        subtitle: parsedClinic.subtitle,
        address: String(formatAddress(clinicInfo.address || clinicInfo.clinicAddress || clinicInfo.location)),
        phone: String(clinicInfo.phone || clinicInfo.mobile || clinicInfo.contact || '+919354303128'),
        email: String(clinicInfo.email || clinicInfo.clinicEmail || clinicInfo.contactEmail || ''),
        logo: clinicInfo.branding?.logo || clinicInfo.logo || clinicInfo.clinicLogo || null,
        website: clinicInfo.website || clinicInfo.branding?.website || fallbackWebsite
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        try {
            if (!dateStr) return format(new Date(), 'dd MMM, yyyy');
            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) return format(new Date(), 'dd MMM, yyyy');
            return format(parsedDate, 'dd MMM, yyyy');
        } catch (e) {
            return format(new Date(), 'dd MMM, yyyy');
        }
    };

    // Doctor details fallback
    const isManomay = info.name.toLowerCase().includes('manomay');
    const attendingDoctorName = doctorDetails?.name || doctorName || (isManomay ? 'Parimal Anand' : 'Attending Doctor');
    const attendingDoctorSpecialization = doctorDetails?.specialization 
        ? `( ${doctorDetails.specialization} )` 
        : (isManomay ? '( Periodontist, Oral Implantologist & Laser Specialist )' : '');
    const attendingDoctorQualification = doctorDetails?.qualification 
        ? doctorDetails.qualification 
        : (isManomay ? 'B.D.S(Manipal), M.D.S(M.A.M.C. New Delhi)' : '');
    const attendingDoctorRegNo = doctorDetails?.registrationNumber 
        ? `Reg. No.${doctorDetails.registrationNumber}` 
        : (doctorDetails?.licenseNumber 
            ? `Reg. No.${doctorDetails.licenseNumber}` 
            : (isManomay ? 'Reg. No.A-14880' : ''));

    // Resolve patient details
    const finalGender = patientDetails?.gender || invoiceData.gender || '';
    const rawAge = patientDetails?.age || invoiceData.age || '';
    const finalAge = rawAge ? `${rawAge} Years` : '';
    const genderAge = [finalGender, finalAge].filter(Boolean).join(', ') || '';

    const patientLocation = invoiceData.patientAddress || patientDetails?.address || '';

    const getReceiptNumber = (index, inst) => {
        if (inst.transactionId) return inst.transactionId;
        const invNum = (billId || '').replace(/\D/g, '');
        const baseNum = parseInt(invNum) || 118;
        return `RCPT${baseNum - (installments.length - 1 - index)}`;
    };

    const generatedOnDate = format(new Date(), 'dd MMM, yyyy');

    return (
        <div id="invoice-print-area" className="bg-white text-black p-6 font-sans relative w-full max-w-[210mm] mx-auto print:p-0" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            <style dangerouslySetInnerHTML={{__html: `
                #invoice-print-area {
                    font-family: 'Arial', 'Helvetica', sans-serif !important;
                    color: #000000 !important;
                    background-color: #ffffff !important;
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    width: 100% !important;
                    max-width: 210mm !important;
                    margin: 0 auto !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .invoice-container {
                    width: 100% !important;
                    min-height: 257mm !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .invoice-content-wrap {
                    flex-grow: 1 !important;
                }
                #invoice-print-area .clinic-logo {
                    width: 65px !important;
                    height: 65px !important;
                    object-fit: contain !important;
                    margin-right: 15px !important;
                }
                #invoice-print-area .clinic-title {
                    font-size: 20px !important;
                    font-weight: bold !important;
                    text-transform: uppercase !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    letter-spacing: 0.5px !important;
                }
                #invoice-print-area .clinic-subtitle {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 4px 0 !important;
                    font-weight: bold !important;
                }
                #invoice-print-area .clinic-detail {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 2px 0 !important;
                }
                #invoice-print-area .doctor-title {
                    font-size: 13px !important;
                    font-weight: bold !important;
                    margin: 0 !important;
                }
                #invoice-print-area .doctor-specialization {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 4px 0 !important;
                }
                #invoice-print-area .doctor-qualification {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 2px 0 !important;
                }
                #invoice-print-area .doctor-reg {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 2px 0 !important;
                }
                #invoice-print-area .separator-line {
                    border: 0 !important;
                    border-top: 1.5px solid #000000 !important;
                    margin: 15px 0 !important;
                }
                #invoice-print-area .patient-name {
                    font-size: 14px !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                }
                #invoice-print-area .patient-label {
                    font-size: 12px !important;
                    color: #000000 !important;
                }
                #invoice-print-area .patient-value {
                    font-size: 12px !important;
                    color: #000000 !important;
                }
                #invoice-print-area .meta-row {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: flex-end !important;
                    margin-top: 15px !important;
                    margin-bottom: 20px !important;
                }
                #invoice-print-area .meta-doctor-by {
                    font-size: 12px !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                }
                #invoice-print-area .meta-title {
                    font-size: 24px !important;
                    font-weight: bold !important;
                    color: #2f855a !important;
                    margin: 6px 0 0 0 !important;
                }
                #invoice-print-area .meta-details {
                    text-align: right !important;
                    font-size: 12px !important;
                    color: #000000 !important;
                }
                #invoice-print-area .meta-details div {
                    margin-bottom: 4px !important;
                }
                #invoice-print-area .meta-bold {
                    font-weight: bold !important;
                }
                #invoice-print-area .items-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin-bottom: 30px !important;
                }
                #invoice-print-area .items-table th {
                    background-color: #cbd5e0 !important;
                    color: #000000 !important;
                    font-weight: bold !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    padding: 10px 10px !important;
                    text-align: left !important;
                    border-top: 1.5px solid #000000 !important;
                    border-bottom: 1.5px solid #000000 !important;
                }
                #invoice-print-area .items-table td {
                    padding: 12px 10px !important;
                    font-size: 12px !important;
                    vertical-align: top !important;
                    border-bottom: 1px dotted #cbd5e0 !important;
                }
                #invoice-print-area .item-date {
                    font-size: 10px !important;
                    color: #4a5568 !important;
                    margin-top: 4px !important;
                }
                #invoice-print-area .financials-section {
                    width: 100% !important;
                    margin-top: 25px !important;
                }
                #invoice-print-area .financials-left {
                    width: 53% !important;
                    float: left !important;
                }
                #invoice-print-area .financials-right {
                    width: 42% !important;
                    float: right !important;
                }
                #invoice-print-area .summary-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                }
                #invoice-print-area .summary-table td {
                    padding: 8px 8px !important;
                    font-size: 12px !important;
                    border-bottom: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .summary-label {
                    text-align: left !important;
                    color: #4a5568 !important;
                }
                #invoice-print-area .summary-value {
                    text-align: right !important;
                    font-weight: bold !important;
                }
                #invoice-print-area .payment-details-title {
                    font-size: 12px !important;
                    font-weight: bold !important;
                    margin-bottom: 8px !important;
                    text-transform: uppercase !important;
                }
                #invoice-print-area .payment-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    font-size: 11px !important;
                    border: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .payment-table th {
                    background-color: #e2e8f0 !important;
                    font-weight: bold !important;
                    padding: 6px 8px !important;
                    text-align: left !important;
                    border: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .payment-table td {
                    padding: 6px 8px !important;
                    border: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .footer {
                    width: 100% !important;
                    margin-top: auto !important;
                    border-top: 1.5px solid #000000 !important;
                    padding-top: 10px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    font-size: 10px !important;
                    color: #000000 !important;
                }
                #invoice-print-area .footer-left {
                    width: 30% !important;
                    text-align: left !important;
                }
                #invoice-print-area .footer-center {
                    width: 40% !important;
                    text-align: center !important;
                }
                #invoice-print-area .footer-right {
                    width: 30% !important;
                    text-align: right !important;
                }
                #invoice-print-area .clearfix::after {
                    content: "" !important;
                    clear: both !important;
                    display: table !important;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #invoice-print-area, #invoice-print-area * {
                        visibility: visible !important;
                    }
                    #invoice-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        padding: 15mm 15mm 25mm 15mm !important;
                        box-sizing: border-box !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        background-color: #ffffff !important;
                    }
                    .print-only {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    @page {
                        size: A4 !important;
                        margin: 0 !important;
                    }
                }
            `}} />

            <div className="invoice-container">
                <div className="invoice-content-wrap">
                    <table className="w-full mb-[20px] border-collapse">
                        <tbody>
                            <tr>
                                <td className="align-top p-0 w-[58%] text-left">
                                    <div className="flex items-center">
                                        {info.logo ? (
                                            <img src={info.logo} alt="Clinic Logo" className="clinic-logo" />
                                        ) : null}
                                        <div>
                                            <h1 className="clinic-title">{info.name}</h1>
                                            {info.subtitle ? <p className="clinic-subtitle">{info.subtitle}</p> : null}
                                            {info.address ? <p className="clinic-detail">{info.address}</p> : null}
                                            {info.website ? <p className="clinic-detail">Website: {info.website}</p> : null}
                                            <p className="clinic-detail">Phone: {info.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="align-top p-0 w-[42%] text-right">
                                    <h2 className="doctor-title">Dr. {attendingDoctorName}</h2>
                                    {attendingDoctorSpecialization && <p className="doctor-specialization">{attendingDoctorSpecialization}</p>}
                                    {attendingDoctorQualification && <p className="doctor-qualification">{attendingDoctorQualification}</p>}
                                    {attendingDoctorRegNo && <p className="doctor-reg">{attendingDoctorRegNo}</p>}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <hr className="separator-line" />

                    <table className="w-full mb-[15px] border-collapse">
                        <tbody>
                            <tr>
                                <td className="p-0 py-0.5 align-top w-[50%] text-left">
                                    <div className="patient-name">{patientName}</div>
                                    <div className="patient-label mt-[4px]">Patient Id: <span className="patient-value font-bold">{patientId}</span></div>
                                </td>
                                <td className="p-0 py-0.5 align-top w-[50%] text-right">
                                    {genderAge && <div className="patient-value font-bold">{genderAge}</div>}
                                    {patientLocation && <div className="patient-value mt-[4px]">{patientLocation}</div>}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <hr className="separator-line" />

                    <div className="meta-row">
                        <div className="text-left">
                            <div className="meta-doctor-by">By: Dr. {attendingDoctorName.toUpperCase()}</div>
                            <h2 className="meta-title">Invoices</h2>
                        </div>
                        <div className="meta-details text-right">
                            <div>Date: <span className="meta-bold">{formatDate(date)}</span></div>
                            <div>Invoice Number: <span className="meta-bold">{billId}</span></div>
                        </div>
                    </div>

                    <table className="items-table">
                        <thead>
                            <tr>
                                <th className="w-[5%] text-center">#</th>
                                <th className="w-[50%] text-left">Treatments & Products</th>
                                <th className="w-[15%] text-right">Unit Cost INR</th>
                                <th className="w-[10%] text-center">Qty</th>
                                <th className="w-[20%] text-right">Total Cost INR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, index) => {
                                const price = Number(item.price || item.unitPrice || item.cost || 0);
                                const qty = Number(item.quantity || item.qty || 1);
                                const itemTotal = Number(item.subtotal !== undefined ? item.subtotal : (item.total !== undefined ? item.total : price * qty));
                                let desc = item.description || item.procedureName || item.medicineName || 'Treatment';
                                if (item.toothNumber) {
                                    desc += ` (Tooth: ${item.toothNumber})`;
                                }

                                return (
                                    <tr key={index}>
                                        <td className="text-center">{index + 1}.</td>
                                        <td className="text-left">
                                            <div className="font-bold text-slate-800">{desc}</div>
                                            <div className="item-date">Date &nbsp; &nbsp; {formatDate(item.date || date)}</div>
                                        </td>
                                        <td className="text-right">{formatCurrency(price)}</td>
                                        <td className="text-center">{qty}</td>
                                        <td className="text-right font-bold">{formatCurrency(itemTotal)}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" className="text-center text-slate-400 py-4 italic">No treatments listed</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="financials-section clearfix">
                        <div className="financials-left">
                            <div className="payment-details-title">Payment Details</div>
                            <table className="payment-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Receipt Number</th>
                                        <th>Mode Of Payment</th>
                                        <th style={{ textAlign: 'right' }}>Amount Paid INR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installments.length > 0 ? installments.map((inst, index) => (
                                        <tr key={index}>
                                            <td>{formatDate(inst.date)}</td>
                                            <td>{getReceiptNumber(index, inst)}</td>
                                            <td>{inst.paymentMethod || 'Card'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(inst.amount)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td>{formatDate(date)}</td>
                                            <td>{invoiceData.transactionId || `RCPT${(parseInt((billId || '').replace(/\D/g, '')) || 118) - 1}`}</td>
                                            <td>{paymentMethod}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(paidAmount)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="financials-right">
                            <table className="summary-table">
                                <tbody>
                                    <tr>
                                        <td className="summary-label">Total Cost:</td>
                                        <td className="summary-value">{formatCurrency(subtotal)} INR</td>
                                    </tr>
                                    <tr>
                                        <td className="summary-label">Grand Total:</td>
                                        <td className="summary-value">{formatCurrency(total)} INR</td>
                                    </tr>
                                    <tr>
                                        <td className="summary-label">Amount Received:</td>
                                        <td className="summary-value">{formatCurrency(paidAmount)} INR</td>
                                    </tr>
                                    <tr>
                                        <td className="summary-label">Balance Amount:</td>
                                        <td className="summary-value">{formatCurrency(dueAmount)} INR</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="footer">
                    <div className="footer-left">Generated On: {generatedOnDate}</div>
                    <div className="footer-center">Computer Generated, No Signature Required Page 1 of 1</div>
                    <div className="footer-right">Powered by Oviaan</div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceTemplate;
