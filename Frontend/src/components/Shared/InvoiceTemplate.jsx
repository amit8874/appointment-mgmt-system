import React from 'react';
import { format } from 'date-fns';

const InvoiceTemplate = ({ invoiceData, clinicInfo }) => {
    // Safe date formatter
    const formatDateSafe = (dateStr) => {
        try {
            if (!dateStr) return format(new Date(), 'dd/MM/yyyy');
            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) return format(new Date(), 'dd/MM/yyyy');
            return format(parsedDate, 'dd/MM/yyyy');
        } catch (e) {
            return format(new Date(), 'dd/MM/yyyy');
        }
    };

    const {
        billId,
        date,
        patientName,
        patientId = 'N/A',
        doctorName = 'N/A',
        items = [],
        subtotal = 0,
        discount = 0,
        taxRate = 0,
        taxAmount = 0,
        total = 0,
        notes = '',
        paymentMethod = 'N/A',
        status = 'Paid'
    } = invoiceData;

    const info = {
        name: clinicInfo.name || 'Healing Hands Medical Center',
        address: clinicInfo.address || '123 Health Avenue, Medical District',
        phone: clinicInfo.phone || '+1 (555) 123-4567',
        email: clinicInfo.email || 'contact@healinghands.com',
        logo: clinicInfo.branding?.logo || clinicInfo.logo,
        ...clinicInfo
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    return (
        <div className="bg-white shadow-2xl w-full max-w-3xl mx-auto relative transform transition-all duration-300 scale-100 print:shadow-none print:w-full print:max-w-none print:m-0 print:max-h-none font-['Inter', 'sans-serif'] text-slate-800">
            {/* Status Watermark */}
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none z-0 print:opacity-10" style={{ zIndex: 0 }}>
                <span className={`text-[100px] font-black uppercase transform -rotate-45 block ${status === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
                    {status}
                </span>
            </div>

            {/* Invoice Content */}
            <div className="p-8 print:p-4 relative z-10 w-full bg-transparent min-h-[1000px] flex flex-col">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase mb-2">INVOICE</h1>
                        <p className="text-sm font-bold text-slate-500">#{billId}</p>
                    </div>
                    
                    <div className="flex items-start text-right mt-4 sm:mt-0 gap-6">
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-slate-800">{info.name}</h2>
                            <p className="text-xs text-slate-600 mt-1 max-w-[250px] ml-auto">{info.address}</p>
                            <p className="text-xs text-slate-600">{info.email}</p>
                            <p className="text-xs text-slate-600">{info.phone}</p>
                        </div>
                        {info.logo && (
                            <div className="flex-shrink-0">
                                <img src={info.logo} alt="Clinic Logo" className="h-20 w-20 object-contain rounded border border-gray-100 p-1 bg-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Billing Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">{patientName}</h3>
                            <p className="text-xs text-slate-600 mt-1">Patient ID: {patientId}</p>
                            <p className="text-xs text-slate-600">Attending Doctor: <span className="font-semibold">{doctorName}</span></p>
                            <p className="text-xs text-slate-600 mt-2 italic">Thank you for choosing {info.name}</p>
                        </div>
                    </div>
                    <div className="sm:text-right">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div className="text-left sm:text-right">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Date</p>
                                <p className="text-xs font-semibold text-slate-800">{formatDateSafe(date)}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                                <p className="text-xs font-semibold text-slate-800">{formatDateSafe(date)}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Mode</p>
                                <p className="text-xs font-semibold text-slate-800">{paymentMethod}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Itemized Table */}
                <div className="mb-8 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-white uppercase tracking-widest">Item Description</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-bold text-white uppercase tracking-widest w-24">Qty</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-white uppercase tracking-widest w-32">Price</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-white uppercase tracking-widest w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {items.length > 0 ? items.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{item.description || 'Service'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-600">{item.quantity || 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-700">{formatCurrency(item.price || item.cost || 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">{formatCurrency((item.quantity || 1) * (item.price || item.cost || 0))}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-400 italic">No items listed on this invoice</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start mt-auto pt-8 border-t border-slate-100">
                    <div className="w-full sm:w-1/2 mb-6 sm:mb-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes & Terms</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {notes || 'Please keep this invoice for your records. For any queries regarding this bill, please contact our billing department.'}
                        </p>
                    </div>
                    <div className="w-full sm:w-5/12 ml-auto">
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <div className="flex justify-between mb-3 text-sm">
                                <span className="font-medium text-slate-600">Subtotal</span>
                                <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between mb-3 text-sm text-red-600">
                                    <span className="font-medium">Discount Applied</span>
                                    <span className="font-bold">-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-3 text-sm">
                                <span className="font-medium text-slate-600">Tax ({taxRate || 0}%)</span>
                                <span className="font-bold text-slate-800">{formatCurrency(taxAmount)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-3 border-t-2 border-slate-800 mt-3">
                                <span className="text-xl font-black text-slate-800 uppercase tracking-tight">Total</span>
                                <span className="text-2xl font-black text-indigo-600">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                    <p>Computer Generated Invoice - No Signature Required</p>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          /* 1. Kill the layout entirely to prevent sidebar/header bleed */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          #root, #root > * { 
            visibility: hidden !important; 
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* 2. Surgical visibility for the invoice container */
          .invoice-print-container {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            z-index: 9999999 !important;
            background: white !important;
          }

          .invoice-print-container *, 
          .invoice-print-container .bg-transparent,
          .invoice-print-container .bg-white {
            visibility: visible !important;
          }

          /* 3. Hide all common UI wrappers explicitly */
          nav, aside, header, footer, button, .no-print {
            display: none !important;
          }

          /* 4. Formatting tweaks for paper */
          @page {
            size: auto;
            margin: 0mm;
          }

          body {
            margin: 0;
            padding: 0;
          }

          /* 5. Fix table rendering broken by Tailwind/Global styles */
          table { display: table !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; }
          th, td { display: table-cell !important; }
          
          /* Ensure watermark prints correctly */
          .opacity-10 { opacity: 0.1 !important; }
        }
      `}} />
        </div>
    );
};

export default InvoiceTemplate;
