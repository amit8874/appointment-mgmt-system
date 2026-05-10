import React from 'react';
import './OviaanDefaultPharmacyInvoiceTemplate.css';

const OviaanDefaultPharmacyInvoiceTemplate = ({ billData = {}, clinicData = {} }) => {
  const {
    patientName = '',
    age = '',
    gender = '',
    doctorName = '',
    patientAddress = '',
    billDate = '',
    billNo = '',
    paymentMode = 'cash',
    cardNo = '',
    grandTotal = 0,
    netAmount = 0,
    amount = 0,
    grossAmount = 0,
    totalAmount = 0,
    subtotal = 0,
    discountAmount = 0,
    discount = 0,
    taxableAmount = 0,
    taxAmount = 0,
    paidAmount = 0,
    balanceAmount = 0,
    amountInWords = '',
    medicines = []
  } = billData;

  // STRICT MAPPING: For Pharmacy, grandTotal/netAmount IS the Final Net Payable.
  // We use multiple fallbacks to ensure compatibility with both internal and standard billing objects.
  const finalTotal = Number(grandTotal || netAmount || amount || 0);
  const initialGross = Number(grossAmount || totalAmount || subtotal || 0);
  const finalDiscount = Number(discountAmount || discount || 0);
  const finalTaxable = Number(taxableAmount || (initialGross - finalDiscount));
  const finalTax = Number(taxAmount || 0);

  const formatAddress = (addr) => {
    if (!addr) return 'Clinic Full address with pincode';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Clinic Full address with pincode';
  };

  const {
    logo = '',
    headerImage = '',
    headerType = 'default',
    name = '',
    clinicName: altClinicName = '',
    branding = null,
    address = null,
    email: clinicEmail = 'Clinic email',
    phone: clinicPhone = 'phone number',
    gstNumber = '',
    showGst = true,
    doctorSignature = ''
  } = clinicData;

  const clinicName = branding?.clinicName || altClinicName || name || 'Clinic Name';

  const clinicAddress = formatAddress(address || clinicData.clinicAddress || clinicData.location);

  // Handle both boolean and string "false" for maximum reliability
  const isGstVisible = showGst === true || showGst === 'true';

  // Use fallback for medicines if items is provided instead
  const medicineItems = medicines.length > 0 ? medicines : (billData.items || []);

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const makeGroup = ([h, t, o]) => {
      return [
        h === '0' ? '' : a[Number(h)] + ' Hundred',
        Number(t + o) < 20 ? a[Number(t + o)] : b[Number(t)] + (o === '0' ? '' : ' ' + a[Number(o)])
      ].filter(Boolean).join(' ');
    };

    const formatIndian = (n) => {
      let s = n.toString().padStart(9, '0');
      const cr = Number(s.slice(0, 2));
      const lak = Number(s.slice(2, 4));
      const th = Number(s.slice(4, 6));
      const hun = Number(s.slice(6, 7));
      const ten = Number(s.slice(7, 9));

      let res = [];
      if (cr) res.push(makeGroup('0' + s.slice(0, 2)) + ' Crore');
      if (lak) res.push(makeGroup('0' + s.slice(2, 4)) + ' Lakh');
      if (th) res.push(makeGroup('0' + s.slice(4, 6)) + ' Thousand');
      if (hun) res.push(a[hun] + ' Hundred');
      if (ten) res.push(makeGroup('0' + s.slice(7, 9)));

      return res.filter(Boolean).join(' ');
    };

    let [main, paise] = num.toString().split('.');
    let word = formatIndian(Number(main)) + ' Rupees';
    if (paise && Number(paise) > 0) {
      word += ' and ' + makeGroup('0' + paise.padEnd(2, '0')) + ' Paise';
    }
    return word;
  };

  const displayAmountInWords = amountInWords || numberToWords(Math.round(finalTotal));

  return (
    <div className="oviaan-default-invoice">
      {/* Header */}
      {headerType === 'custom' && (headerImage || logo) ? (
        <div className="oviaan-custom-header">
          <img src={headerImage || logo} alt="Clinic Header" className="oviaan-header-img-full" />
        </div>
      ) : (
        <div className="oviaan-default-header">
          <div className="oviaan-logo-container">
            {logo ? (
              <img src={logo} alt="Logo" className="oviaan-logo-img" />
            ) : (
              <span className="oviaan-logo-placeholder">Logo</span>
            )}
          </div>
          <div className="oviaan-clinic-details">
            <h1 className="oviaan-clinic-name">{clinicName}</h1>
            <p className="oviaan-clinic-info">{clinicAddress}</p>
            <p className="oviaan-clinic-info">{clinicEmail} and</p>
            <p className="oviaan-clinic-info">{clinicPhone}</p>
          </div>
          <div style={{ width: '100px' }}></div> {/* Adjusted Spacer */}
        </div>
      )}

      {/* GST Section */}
      {isGstVisible && gstNumber && (
        <div className="oviaan-gst-section">
          GST NO : {gstNumber}
        </div>
      )}

      <div className="oviaan-title-container">
        <div className="oviaan-invoice-title">INVOICE / RECEIPT</div>
      </div>

      {/* Patient and Bill Details */}
      <div className="oviaan-patient-bill-details">
        <div className="oviaan-details-left">
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Patient Name :</span>
            <span className="oviaan-detail-value">{patientName}</span>
          </div>
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Age / Sex :</span>
            <span className="oviaan-detail-value">{age} Years / {gender}</span>
          </div>
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Dr.Name :</span>
            <span className="oviaan-detail-value">{doctorName}</span>
          </div>
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Address :</span>
            <span className="oviaan-detail-value">{patientAddress}</span>
          </div>
        </div>
        <div className="oviaan-details-right">
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Bill Date :</span>
            <span className="oviaan-detail-value">{billDate}</span>
          </div>
          <div className="oviaan-detail-row">
            <span className="oviaan-detail-label">Bill No :</span>
            <span className="oviaan-detail-value">{billNo}</span>
          </div>
        </div>
      </div>

      {/* Medicine Table */}
      <table className="oviaan-medicine-table">
        <thead>
          <tr>
            <th className="oviaan-text-center" style={{ width: '30px' }}>Sr.</th>
            <th className="oviaan-text-left">Medicine Name</th>
            <th className="oviaan-text-center" style={{ width: '70px' }}>Batch</th>
            <th className="oviaan-text-center" style={{ width: '60px' }}>Expiry</th>
            <th className="oviaan-text-right" style={{ width: '60px' }}>MRP</th>
            <th className="oviaan-text-right" style={{ width: '60px' }}>Rate</th>
            <th className="oviaan-text-center" style={{ width: '40px' }}>Qty</th>
            {isGstVisible && <th className="oviaan-text-center" style={{ width: '40px' }}>GST%</th>}
            <th className="oviaan-text-center" style={{ width: '40px' }}>Disc%</th>
            <th className="oviaan-text-right" style={{ width: '70px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {medicineItems.map((item, index) => (
            <tr key={index}>
              <td className="oviaan-text-center">{index + 1}</td>
              <td className="oviaan-text-left">
                <div style={{ fontWeight: 'bold' }}>{item.medicineName || item.description || item.name || 'Medicine'}</div>
                {item.category && <div style={{ fontSize: '8px', color: '#666' }}>{item.category} • {item.type}</div>}
              </td>
              <td className="oviaan-text-center">{item.batchNo || item.batchNumber || 'N/A'}</td>
              <td className="oviaan-text-center">{item.expiryDate || item.expiry || 'N/A'}</td>
              <td className="oviaan-text-right">{formatCurrency(item.mrp)}</td>
              <td className="oviaan-text-right">{formatCurrency(item.sellingPrice || item.unitPrice || item.price || 0)}</td>
              <td className="oviaan-text-center">{item.qty || item.quantity || 0}</td>
              {isGstVisible && <td className="oviaan-text-center">{item.gstPercentage || item.tax || 0}</td>}
              <td className="oviaan-text-center">{item.discountPercentage || 0}</td>
              <td className="oviaan-text-right">{formatCurrency(item.totalAmount || item.subtotal || item.total || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Row */}
      <div className="oviaan-payment-row">
        <span>Pay Mode : {paymentMode.toUpperCase()}</span>
        <span>GST SUMMARY: Included in Total</span>
        <span className="oviaan-payment-total">GRAND TOTAL : ₹{formatCurrency(finalTotal)}</span>
      </div>

      {/* Bottom Section */}
      <div className="oviaan-bottom-section">
        <div className="oviaan-bottom-left">
          <p style={{ fontWeight: 'bold', margin: '0' }}>Amount in Words:</p>
          <p style={{ margin: '2px 0', textTransform: 'capitalize' }}>{displayAmountInWords} Only</p>
        </div>
        <div className="oviaan-bottom-right">
          <div className="oviaan-amount-row">
            <span className="oviaan-amount-label">Gross Total :</span>
            <span className="oviaan-amount-value">{formatCurrency(initialGross)}</span>
          </div>
          <div className="oviaan-amount-row">
            <span className="oviaan-amount-label">Total Discount :</span>
            <span className="oviaan-amount-value">{formatCurrency(discountAmount)}</span>
          </div>
          <div className="oviaan-amount-row">
            <span className="oviaan-amount-label">Taxable Amount :</span>
            <span className="oviaan-amount-value">{formatCurrency(finalTaxable)}</span>
          </div>
          <div className="oviaan-amount-row">
            <span className="oviaan-amount-label">Total Tax (GST) :</span>
            <span className="oviaan-amount-value">{formatCurrency(finalTax)}</span>
          </div>
          <div className="oviaan-amount-row oviaan-balance-row">
            <span className="oviaan-amount-label">NET PAYABLE :</span>
            <span className="oviaan-amount-value">₹{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      {doctorSignature && (
        <div className="oviaan-signature-section">
          <img src={doctorSignature} alt="Doctor Signature" className="oviaan-doctor-signature" />
        </div>
      )}
    </div>
  );
};

export default OviaanDefaultPharmacyInvoiceTemplate;
