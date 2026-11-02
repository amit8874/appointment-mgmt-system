import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { centralDoctorApi, patientApi } from '../../services/api';
import { formatDateDMY } from '../../utils/billingCalculations';

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverUrl}${cleanPath}`;
};

const convertUrlToBase64 = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
        const fullUrl = getImageUrl(url);
        const response = await fetch(fullUrl, { cache: 'force-cache' });
        if (!response.ok) return fullUrl;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(fullUrl);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn("Could not pre-convert image to base64 for printing:", err);
        return getImageUrl(url);
    }
};

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
    const discount = Number(invoiceData.discount ?? invoiceData.discountAmount ?? 0);
    const taxAmount = Number(invoiceData.taxAmount ?? 0);

    const [doctorDetails, setDoctorDetails] = useState(null);
    const [stampDataUrl, setStampDataUrl] = useState(null);
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);

    useEffect(() => {
        let active = true;
        const resolveImages = async () => {
            const rawStamp = doctorDetails?.doctorStamp || invoiceData.doctorStamp || clinicInfo.stamp;
            const rawSignature = doctorDetails?.doctorSignature || invoiceData.doctorSignature || clinicInfo.doctorSignature;

            if (rawStamp) {
                const b64 = await convertUrlToBase64(rawStamp);
                if (active) setStampDataUrl(b64);
            } else {
                if (active) setStampDataUrl(null);
            }

            if (rawSignature) {
                const b64 = await convertUrlToBase64(rawSignature);
                if (active) setSignatureDataUrl(b64);
            } else {
                if (active) setSignatureDataUrl(null);
            }
        };
        resolveImages();
        return () => { active = false; };
    }, [doctorDetails, invoiceData.doctorStamp, invoiceData.doctorSignature, clinicInfo.stamp, clinicInfo.doctorSignature]);

    useEffect(() => {
        const fetchDoctor = async () => {
            if (invoiceData.doctorStamp && invoiceData.doctorSignature) {
                setDoctorDetails({
                    doctorStamp: invoiceData.doctorStamp,
                    doctorSignature: invoiceData.doctorSignature,
                    name: doctorName
                });
                return;
            }

            let fetchedDoc = null;
            const docId = invoiceData.doctorId || invoiceData.doctor?._id || invoiceData.doctor?.id || (typeof invoiceData.doctor === 'string' ? invoiceData.doctor : null);
            if (docId && docId !== 'N/A') {
                try {
                    const doc = await centralDoctorApi.getById(docId);
                    if (doc) {
                        fetchedDoc = doc;
                        setDoctorDetails(doc);
                        if (doc.doctorStamp && doc.doctorSignature) return;
                    }
                } catch (e) {
                    console.warn("Could not fetch doctor by ID in InvoiceTemplate:", e.message);
                }
            }

            try {
                const response = await centralDoctorApi.getAll();
                const docsList = response?.doctors || (Array.isArray(response) ? response : []);
                
                if (doctorName && doctorName !== 'N/A') {
                    const cleanTargetName = doctorName.replace(/^dr\.?\s*/i, '').trim().toLowerCase();
                    const match = docsList.find(d => {
                        const dName = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).replace(/^dr\.?\s*/i, '').trim().toLowerCase();
                        return (dName && cleanTargetName && (dName.includes(cleanTargetName) || cleanTargetName.includes(dName)));
                    });
                    if (match) {
                        setDoctorDetails(match);
                        if (match.doctorStamp && match.doctorSignature) return;
                    }
                }

                // Permanent fallback: Merge any doctor in the clinic who uploaded a stamp/signature if missing
                const docWithStamp = docsList.find(d => d.doctorStamp || d.doctorSignature);
                if (docWithStamp) {
                    setDoctorDetails(prev => ({
                        ...(prev || fetchedDoc || {}),
                        doctorStamp: prev?.doctorStamp || fetchedDoc?.doctorStamp || invoiceData.doctorStamp || docWithStamp.doctorStamp,
                        doctorSignature: prev?.doctorSignature || fetchedDoc?.doctorSignature || invoiceData.doctorSignature || docWithStamp.doctorSignature,
                        name: prev?.name || fetchedDoc?.name || docWithStamp.name
                    }));
                    return;
                }

                if (docsList.length > 0 && !fetchedDoc) {
                    setDoctorDetails(docsList[0]);
                    return;
                }
            } catch (e) {
                console.error("Error fetching doctor in InvoiceTemplate:", e);
            }
        };
        fetchDoctor();
    }, [invoiceData.doctorId, doctorName, invoiceData.doctorStamp, invoiceData.doctorSignature]);

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

    const rawClinicName = String(clinicInfo.branding?.clinicName || clinicInfo.clinicName || clinicInfo.name || 'SMILE CLINIC');
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
        phone: String(clinicInfo.phone || clinicInfo.mobile || clinicInfo.contact || ''),
        email: String(clinicInfo.email || clinicInfo.clinicEmail || clinicInfo.contactEmail || ''),
        logo: clinicInfo.branding?.logo || clinicInfo.logo || clinicInfo.clinicLogo || null,
        website: clinicInfo.website || clinicInfo.branding?.website || (info?.address ? '' : fallbackWebsite)
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return formatDateDMY(new Date());
        return formatDateDMY(dateStr);
    };

    // Doctor details fallback
    const isManomay = info.name.toLowerCase().includes('manomay');
    const rawDocName = doctorDetails?.name || doctorName || (isManomay ? 'Parimal Anand' : 'Amit Maurya');
    const attendingDoctorName = String(rawDocName).replace(/^dr\.?\s*/i, '').trim();
    const rawDoctorSpec = doctorDetails?.specialization || doctorDetails?.specialty || doctorDetails?.department || invoiceData?.doctorSpecialization || invoiceData?.specialty || '';
    let formattedSpec = rawDoctorSpec.trim();
    if (formattedSpec.toLowerCase() === 'dental' || formattedSpec.toLowerCase() === 'dentist') {
        formattedSpec = 'Dental Surgeon';
    }
    const attendingDoctorSpecialization = formattedSpec 
        ? `( ${formattedSpec} )` 
        : (isManomay ? '( Periodontist, Oral Implantologist & Laser Specialist )' : '( Dental Surgeon )');
    
    const attendingDoctorQualification = doctorDetails?.qualification 
        ? doctorDetails.qualification 
        : (isManomay ? 'B.D.S(Manipal), M.D.S(M.A.M.C. New Delhi)' : 'BDS, MD, MBBS');
    
    const attendingDoctorQualLines = attendingDoctorQualification.includes(',')
        ? attendingDoctorQualification.split(',').map(s => s.trim()).filter(Boolean)
        : (attendingDoctorQualification ? [attendingDoctorQualification.trim()] : []);

    const attendingDoctorRegNo = doctorDetails?.registrationNumber 
        ? `Reg. No.${doctorDetails.registrationNumber}` 
        : (doctorDetails?.licenseNumber 
            ? `Reg. No.${doctorDetails.licenseNumber}` 
            : (isManomay ? 'Reg. No.A-14880' : 'Reg. No.ABCD123ABCD'));

    // Resolve patient details
    const finalGender = patientDetails?.gender || invoiceData.gender || 'Male';
    const rawAge = patientDetails?.age || invoiceData.age || '25';
    const finalAge = rawAge ? `${rawAge} Years` : 'N/A';
    const finalMobile = patientDetails?.mobile || patientDetails?.phone || patientDetails?.contactNumber || invoiceData.patientPhone || invoiceData.contactNumber || invoiceData.mobile || 'N/A';
    const finalPatientId = invoiceData.patientId || patientDetails?.patientId || 'N/A';
    const patientLocation = invoiceData.patientAddress || patientDetails?.address || '';

    const invoiceNumber = invoiceData.billId || invoiceData.invoiceNumber || 'BIL000043';
    const baseReceiptNumber = invoiceData.receiptNumber || invoiceData.transactionId || `RCPT-${(String(invoiceNumber || '').replace(/\D/g, '') || '000043')}`;
    const receiptNumber = baseReceiptNumber;
    const invoiceDate = formatDate(date || invoiceData.date);

    const getReceiptNumber = (index, inst) => {
        if (inst.receiptNumber) return inst.receiptNumber;
        if (inst.transactionId) return inst.transactionId;
        return (installments.length > 1 || (items.length > 1 && !installments.length)) 
            ? `${baseReceiptNumber}-${index + 1}` 
            : baseReceiptNumber;
    };

    const generatedOnDate = format(new Date(), 'dd MMM yyyy');

    const rawStamp = doctorDetails?.doctorStamp || invoiceData.doctorStamp || clinicInfo.stamp;
    const rawSignature = doctorDetails?.doctorSignature || invoiceData.doctorSignature || clinicInfo.doctorSignature;
    const finalStamp = stampDataUrl || (rawStamp ? getImageUrl(rawStamp) : null);
    const finalSignature = signatureDataUrl || (rawSignature ? getImageUrl(rawSignature) : null);

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
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                #invoice-print-area .invoice-container {
                    width: 100% !important;
                    min-height: 267mm !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .invoice-content-wrap {
                    flex-grow: 1 !important;
                }
                #invoice-print-area .header-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #000000 !important;
                    margin-bottom: 12px !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .header-table td.clinic-col {
                    width: 58% !important;
                    vertical-align: top !important;
                    padding: 10px 14px !important;
                    border-right: 1.5px solid #000000 !important;
                    text-align: left !important;
                }
                #invoice-print-area .header-table td.doctor-col {
                    width: 42% !important;
                    vertical-align: top !important;
                    padding: 10px 14px !important;
                    text-align: right !important;
                }
                #invoice-print-area .clinic-logo {
                    width: 65px !important;
                    height: 65px !important;
                    object-fit: contain !important;
                    margin-right: 15px !important;
                }
                #invoice-print-area .clinic-title {
                    font-size: 19px !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                }
                #invoice-print-area .clinic-subtitle {
                    font-size: 11px !important;
                    color: #000000 !important;
                    margin: 3px 0 !important;
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
                    margin: 3px 0 !important;
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
                #invoice-print-area .patient-box {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #000000 !important;
                    margin-bottom: 12px !important;
                    background-color: #fafbfc !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .patient-box td.patient-col-left {
                    width: 50% !important;
                    vertical-align: top !important;
                    padding: 8px 14px !important;
                    border-right: 1.5px solid #000000 !important;
                }
                #invoice-print-area .patient-box td.patient-col-right {
                    width: 50% !important;
                    vertical-align: top !important;
                    padding: 8px 14px !important;
                }
                #invoice-print-area .patient-row-item {
                    display: flex !important;
                    justify-content: space-between !important;
                    padding: 2.5px 0 !important;
                    border-bottom: 1px dashed #cbd5e0 !important;
                }
                #invoice-print-area .patient-row-item:last-child {
                    border-bottom: none !important;
                }
                #invoice-print-area .patient-name {
                    font-size: 13px !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                }
                #invoice-print-area .patient-label {
                    font-size: 11px !important;
                    color: #4a5568 !important;
                    font-weight: bold !important;
                }
                #invoice-print-area .patient-value {
                    font-size: 12px !important;
                    color: #000000 !important;
                    font-weight: bold !important;
                }
                #invoice-print-area .meta-box {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #000000 !important;
                    margin-bottom: 16px !important;
                    background-color: #f8fafc !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .meta-box td.meta-box-left {
                    width: 55% !important;
                    padding: 8px 14px !important;
                    vertical-align: middle !important;
                    border-right: 1.5px solid #000000 !important;
                    text-align: left !important;
                }
                #invoice-print-area .meta-box td.meta-box-right {
                    width: 45% !important;
                    padding: 8px 14px !important;
                    vertical-align: middle !important;
                    text-align: right !important;
                }
                #invoice-print-area .meta-doctor-by {
                    font-size: 11px !important;
                    font-weight: bold !important;
                    color: #4a5568 !important;
                    text-transform: uppercase !important;
                }
                #invoice-print-area .meta-title {
                    font-size: 20px !important;
                    font-weight: 900 !important;
                    color: #2f855a !important;
                    margin: 2px 0 0 0 !important;
                }
                #invoice-print-area .meta-details {
                    text-align: right !important;
                    font-size: 11px !important;
                    color: #4a5568 !important;
                }
                #invoice-print-area .meta-details div {
                    margin-bottom: 3px !important;
                }
                #invoice-print-area .meta-bold {
                    font-weight: 900 !important;
                    color: #000000 !important;
                }
                #invoice-print-area .items-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #000000 !important;
                    margin-bottom: 20px !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .items-table th {
                    background-color: #e2e8f0 !important;
                    color: #000000 !important;
                    font-weight: bold !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    padding: 8px 8px !important;
                    text-align: left !important;
                    border: 1px solid #000000 !important;
                }
                #invoice-print-area .items-table td {
                    padding: 9px 8px !important;
                    font-size: 12px !important;
                    vertical-align: top !important;
                    border: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .items-table tr:nth-child(even) td {
                    background-color: #fafbfc !important;
                }
                #invoice-print-area .item-date {
                    font-size: 10px !important;
                    color: #4a5568 !important;
                    margin-top: 3px !important;
                }
                #invoice-print-area .financials-container {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1.5px solid #000000 !important;
                    margin-top: 15px !important;
                    box-sizing: border-box !important;
                }
                #invoice-print-area .financials-container td.fin-left {
                    width: 53% !important;
                    vertical-align: top !important;
                    padding: 10px 12px !important;
                    border-right: 1.5px solid #000000 !important;
                    text-align: left !important;
                }
                #invoice-print-area .financials-container td.fin-right {
                    width: 47% !important;
                    vertical-align: top !important;
                    padding: 10px 12px !important;
                }
                #invoice-print-area .payment-details-title {
                    font-size: 11px !important;
                    font-weight: bold !important;
                    margin-bottom: 6px !important;
                    text-transform: uppercase !important;
                    color: #1a202c !important;
                }
                #invoice-print-area .payment-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1px solid #000000 !important;
                    font-size: 11px !important;
                }
                #invoice-print-area .payment-table th {
                    background-color: #e2e8f0 !important;
                    font-weight: bold !important;
                    padding: 5px 7px !important;
                    text-align: left !important;
                    border: 1px solid #000000 !important;
                }
                #invoice-print-area .payment-table td {
                    padding: 6px 7px !important;
                    border: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .summary-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 1px solid #000000 !important;
                }
                #invoice-print-area .summary-table td {
                    padding: 6px 8px !important;
                    font-size: 12px !important;
                    border-bottom: 1px solid #cbd5e0 !important;
                }
                #invoice-print-area .summary-table td.summary-label {
                    text-align: left !important;
                    font-weight: 600 !important;
                    color: #2d3748 !important;
                    border-right: 1px solid #cbd5e0 !important;
                    width: 55% !important;
                }
                #invoice-print-area .summary-table td.summary-value {
                    text-align: right !important;
                    font-weight: bold !important;
                    width: 45% !important;
                }
                #invoice-print-area .summary-table tr.grand-total-row td {
                    background-color: #f7fafc !important;
                    border-top: 1.5px solid #000000 !important;
                    border-bottom: 1.5px solid #000000 !important;
                    font-size: 13px !important;
                    font-weight: 900 !important;
                }
                #invoice-print-area .summary-table tr.balance-row td {
                    background-color: #fff5f5 !important;
                    border-top: 1.5px solid #000000 !important;
                    font-weight: 900 !important;
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
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: 270mm !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-only {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    @page {
                        size: A4 portrait !important;
                        margin: 12mm 14mm 12mm 14mm !important;
                    }
                }
            `}} />

            <div className="invoice-container">
                <div className="invoice-content-wrap">
                    {/* 1. Header Box */}
                    <table className="header-table">
                        <tbody>
                            <tr>
                                <td className="clinic-col">
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {info.logo ? (
                                            <img src={getImageUrl(info.logo)} alt="Clinic Logo" className="clinic-logo" />
                                        ) : null}
                                        <div>
                                            <h1 className="clinic-title">{info.name}</h1>
                                            {info.subtitle ? <p className="clinic-subtitle">{info.subtitle}</p> : null}
                                            {info.address ? <p className="clinic-detail">{info.address}</p> : null}
                                            {info.website ? <p className="clinic-detail">Website: {info.website}</p> : null}
                                            {info.phone ? <p className="clinic-detail">Phone: {info.phone}</p> : null}
                                        </div>
                                    </div>
                                </td>
                                <td className="doctor-col">
                                    <h2 className="doctor-title">Dr. {attendingDoctorName}</h2>
                                    {attendingDoctorSpecialization ? <p className="doctor-specialization">{attendingDoctorSpecialization}</p> : null}
                                    {attendingDoctorQualLines.length > 0 ? attendingDoctorQualLines.map((l, idx) => (
                                        <p key={idx} className="doctor-qualification">{l}</p>
                                    )) : null}
                                    {attendingDoctorRegNo ? <p className="doctor-reg">{attendingDoctorRegNo}</p> : null}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 2. Patient Details Box */}
                    <table className="patient-box">
                        <tbody>
                            <tr>
                                <td className="patient-col-left">
                                    <div className="patient-row-item">
                                        <span className="patient-label">Patient Name:</span>
                                        <span className="patient-name">{patientName}</span>
                                    </div>
                                    <div className="patient-row-item">
                                        <span className="patient-label">Patient ID:</span>
                                        <span className="patient-value">{finalPatientId}</span>
                                    </div>
                                    <div className="patient-row-item">
                                        <span className="patient-label">Mobile No:</span>
                                        <span className="patient-value">{finalMobile}</span>
                                    </div>
                                </td>
                                <td className="patient-col-right">
                                    <div className="patient-row-item">
                                        <span className="patient-label">Age / Gender:</span>
                                        <span className="patient-value">{finalAge} / {finalGender}</span>
                                    </div>
                                    <div className="patient-row-item">
                                        <span className="patient-label">Date:</span>
                                        <span className="patient-value">{invoiceDate}</span>
                                    </div>
                                    {patientLocation ? (
                                        <div className="patient-row-item">
                                            <span className="patient-label">Address:</span>
                                            <span className="patient-value" style={{ fontSize: '11px' }}>{patientLocation}</span>
                                        </div>
                                    ) : null}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 3. Attending Doctor & Meta Box */}
                    <table className="meta-box">
                        <tbody>
                            <tr>
                                <td className="meta-box-left">
                                    <div className="meta-doctor-by">Attending Doctor</div>
                                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#000000' }}>Dr. {attendingDoctorName.toUpperCase()}</div>
                                    <div className="meta-title">INVOICE / RECEIPT</div>
                                </td>
                                <td className="meta-box-right">
                                    <div className="meta-details">
                                        <div>Invoice Number: <span className="meta-bold">{invoiceNumber}</span></div>
                                        <div>Receipt Number: <span className="meta-bold">{receiptNumber}</span></div>
                                        <div>Billing Date: <span className="meta-bold">{invoiceDate}</span></div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 4. Treatments & Products Table */}
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                                <th style={{ width: '50%', textAlign: 'left' }}>Treatments & Products</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Unit Cost INR</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '20%', textAlign: 'right' }}>Total Cost INR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, index) => {
                                const price = Number(item.price || item.unitPrice || item.rate || item.cost || 0);
                                const qty = Number(item.quantity || item.qty || 1);
                                const itemTotal = Number(item.subtotal !== undefined ? item.subtotal : (item.total !== undefined ? item.total : price * qty));
                                let desc = item.description || item.procedureName || item.medicineName || 'Treatment';
                                if (item.toothNumber) {
                                    desc += ` (Tooth: ${item.toothNumber})`;
                                }
                                const itemPaymentMode = item.paymentMode || item.paymentMethod;

                                return (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'center' }}>{index + 1}.</td>
                                        <td style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', color: '#000000' }}>
                                                {desc}
                                                {itemPaymentMode && itemPaymentMode !== 'N/A' && (
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginLeft: '6px' }}>
                                                        [{itemPaymentMode}]
                                                    </span>
                                                )}
                                            </div>
                                            <div className="item-date">Date &nbsp; &nbsp; {formatDate(item.date || date)}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(price)}</td>
                                        <td style={{ textAlign: 'center' }}>{qty}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(itemTotal)}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#718096', fontStyle: 'italic' }}>
                                        No treatments or products listed.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* 5. Financials Container (Payment Details & Summary) */}
                    <table className="financials-container">
                        <tbody>
                            <tr>
                                <td className="fin-left">
                                    <div className="payment-details-title">Payment Details</div>
                                    <table className="payment-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Receipt Number</th>
                                                <th>Mode</th>
                                                <th>For Treatment</th>
                                                <th style={{ textAlign: 'right' }}>Amount Paid INR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {installments.length > 0 ? installments.map((inst, index) => {
                                                const rcpt = getReceiptNumber(index, inst);
                                                const treatmentDesc = inst.procedureName || inst.notes || '';
                                                return (
                                                    <tr key={index}>
                                                        <td>{formatDate(inst.date)}</td>
                                                        <td style={{ fontWeight: '600' }}>{rcpt}</td>
                                                        <td><span style={{ fontWeight: 'bold' }}>{inst.paymentMethod || 'Cash'}</span></td>
                                                        <td style={{ fontSize: '11px', color: '#475569' }}>{treatmentDesc || '—'}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(inst.amount)}</td>
                                                    </tr>
                                                );
                                            }) : (items.length > 0 && items.some(it => it.paymentMode)) ? (
                                                items.filter(it => (it.subtotal || it.price || 0) > 0).map((it, index) => {
                                                    const rcpt = items.length > 1 ? `${baseReceiptNumber}-${index + 1}` : baseReceiptNumber;
                                                    const mode = it.paymentMode || it.paymentMethod || paymentMethod || 'Cash';
                                                    return (
                                                        <tr key={index}>
                                                            <td>{formatDate(date)}</td>
                                                            <td style={{ fontWeight: '600' }}>{rcpt}</td>
                                                            <td><span style={{ fontWeight: 'bold' }}>{mode}</span></td>
                                                            <td style={{ fontSize: '11px', color: '#475569' }}>{it.description || it.procedureName || 'Procedure'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(it.subtotal || it.price || 0)}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td>{formatDate(date)}</td>
                                                    <td style={{ fontWeight: '600' }}>{baseReceiptNumber}</td>
                                                    <td><span style={{ fontWeight: 'bold' }}>{paymentMethod === 'Multiple' ? 'Cash' : (paymentMethod || 'Cash')}</span></td>
                                                    <td style={{ fontSize: '11px', color: '#475569' }}>General Consultation</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(paidAmount)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </td>

                                <td className="fin-right">
                                    <table className="summary-table">
                                        <tbody>
                                            <tr>
                                                <td className="summary-label">Total Cost:</td>
                                                <td className="summary-value">{formatCurrency(subtotal)} INR</td>
                                            </tr>
                                            {discount > 0 && (
                                                <tr style={{ color: '#e53e3e' }}>
                                                    <td className="summary-label" style={{ color: '#e53e3e' }}>Discount:</td>
                                                    <td className="summary-value">-{formatCurrency(discount)} INR</td>
                                                </tr>
                                            )}
                                            {taxAmount > 0 && (
                                                <tr>
                                                    <td className="summary-label">GST / Tax:</td>
                                                    <td className="summary-value">+{formatCurrency(taxAmount)} INR</td>
                                                </tr>
                                            )}
                                            <tr className="grand-total-row">
                                                <td className="summary-label" style={{ fontSize: '13px', fontWeight: 900, color: '#000000' }}>Grand Total:</td>
                                                <td className="summary-value" style={{ fontSize: '13px', fontWeight: 900, color: '#000000' }}>{formatCurrency(total)} INR</td>
                                            </tr>
                                            <tr>
                                                <td className="summary-label">Amount Received:</td>
                                                <td className="summary-value" style={{ color: '#16a34a' }}>{formatCurrency(paidAmount)} INR</td>
                                            </tr>
                                            <tr className="balance-row">
                                                <td className="summary-label" style={{ fontWeight: 900 }}>Balance Amount:</td>
                                                <td className="summary-value" style={{ fontWeight: 900, color: dueAmount > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(dueAmount)} INR</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {(finalStamp || finalSignature) && (
                                        <div style={{ marginTop: '14px', marginBottom: '-4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px' }}>
                                            {finalStamp && (
                                                <img src={finalStamp} alt="Doctor Stamp" style={{ maxHeight: '80px', maxWidth: '130px', objectFit: 'contain', backgroundColor: 'transparent' }} />
                                            )}
                                            {finalSignature && (
                                                <img src={finalSignature} alt="Doctor Signature" style={{ maxHeight: '70px', maxWidth: '140px', objectFit: 'contain', backgroundColor: 'transparent' }} />
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 6. Footer */}
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
