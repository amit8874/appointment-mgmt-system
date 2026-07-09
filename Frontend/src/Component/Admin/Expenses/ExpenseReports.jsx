import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, FileDown, Printer, Calendar, RefreshCw, Info,
  Filter, IndianRupee, Tag, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { expenseApi } from '../../../services/api';

const ExpenseReports = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    equipmentTotal: 0,
    consumerTotal: 0,
    labTotal: 0,
    grandTotal: 0
  });

  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('month'); // default: this month
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const printAreaRef = useRef(null);

  useEffect(() => {
    fetchReportData();
  }, [filterType, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {
        filterType,
        startDate: filterType === 'custom' ? customStartDate : undefined,
        endDate: filterType === 'custom' ? customEndDate : undefined
      };
      const res = await expenseApi.getUnifiedExpenses(params);
      setExpenses(res.expenses || []);
      setSummary(res.summary || {
        equipmentTotal: 0,
        consumerTotal: 0,
        labTotal: 0,
        grandTotal: 0
      });
    } catch (error) {
      console.error('Error fetching unified reports:', error);
      toast.error('Failed to load expense report data.');
    } finally {
      setLoading(false);
    }
  };

  // Excel Export: Multi-sheet workbook
  const handleExportExcel = () => {
    if (expenses.length === 0) {
      toast.warning('No report data available to export.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      { 'Expense Category': 'Dental Equipment Expenses', 'Total Amount (INR)': summary.equipmentTotal },
      { 'Expense Category': 'Dental Consumer Product Expenses', 'Total Amount (INR)': summary.consumerTotal },
      { 'Expense Category': 'Dental Lab Expenses', 'Total Amount (INR)': summary.labTotal },
      { 'Expense Category': 'Grand Total', 'Total Amount (INR)': summary.grandTotal }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Helper to map category items
    const formatItemsForSheet = (list) => list.map((e, idx) => ({
      'S.No': idx + 1,
      'Name / Detail': e.equipmentName || e.productName || e.labName || 'Expense',
      'Detail': e.brand ? `${e.brand} ${e.modelNumber || ''}`.trim() : (e.category || e.treatmentType || e.workType || '-'),
      'Vendor / Supplier / Lab': e.vendor || e.supplier || e.labName || '-',
      'Quantity': e.quantity || 1,
      'Unit Price (INR)': e.unitPrice || e.cost || 0,
      'GST Amount (INR)': e.gstAmount || 0,
      'Total Amount (INR)': e.totalAmount,
      'Payment Status': e.paymentStatus,
      'Transaction Date': e.purchaseDate ? new Date(e.purchaseDate).toLocaleDateString() : e.sentDate ? new Date(e.sentDate).toLocaleDateString() : new Date(e.createdAt).toLocaleDateString()
    }));

    // 2. Equipment sheet
    const eqList = expenses.filter(e => e.expenseType === 'Equipment');
    if (eqList.length > 0) {
      const eqSheet = XLSX.utils.json_to_sheet(formatItemsForSheet(eqList));
      XLSX.utils.book_append_sheet(workbook, eqSheet, 'Equipment');
    }

    // 3. Consumer Products sheet
    const consList = expenses.filter(e => e.expenseType === 'Consumer Products');
    if (consList.length > 0) {
      const consSheet = XLSX.utils.json_to_sheet(formatItemsForSheet(consList));
      XLSX.utils.book_append_sheet(workbook, consSheet, 'Consumables');
    }

    // 4. Lab Expenses sheet
    const labList = expenses.filter(e => e.expenseType === 'Lab Expenses');
    if (labList.length > 0) {
      const labSheet = XLSX.utils.json_to_sheet(formatItemsForSheet(labList));
      XLSX.utils.book_append_sheet(workbook, labSheet, 'Lab Expenses');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Unified_Expense_Reports_${dateStr}.xlsx`);
    toast.success('Multi-sheet Excel report exported successfully!');
  };

  // PDF Export via backend Puppeteer
  const handleExportPDF = async () => {
    try {
      const params = {
        filterType,
        startDate: filterType === 'custom' ? customStartDate : undefined,
        endDate: filterType === 'custom' ? customEndDate : undefined
      };
      toast.info('Generating Unified PDF Report...');
      const response = await expenseApi.downloadUnifiedPdf(params);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Unified_Expense_Reports_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate unified PDF report.');
    }
  };

  // Browser Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-gray-900/50 min-h-screen printable-area">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            📂 Expense Reports
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest mt-1">
            Consolidated reports of all clinic expenses with advanced filtering & multi-format exports
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <FileDown size={16} className="text-rose-600" />
            <span>PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Printer size={16} className="text-indigo-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Date bar */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Duration:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none bg-slate-50/50 dark:bg-gray-900/50"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-medium outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
              />
            </div>
          )}

          <button
            onClick={fetchReportData}
            className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
            title="Reload report data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Printable Report Title block (visible only when printing) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-300 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800">Unified Clinic Expense Report</h2>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Period: {filterType.toUpperCase()} {filterType === 'custom' ? `(${customStartDate} to ${customEndDate})` : ''}
        </p>
        <p className="text-xs font-medium text-slate-400 mt-0.5">Report Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Equipment Total */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Equipment Expenses</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{summary.equipmentTotal.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        {/* Consumer Products Total */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Consumer Products</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{summary.consumerTotal.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        {/* Lab Expenses Total */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest">Lab case Expenses</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">₹{summary.labTotal.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-950/20 dark:via-gray-800 dark:to-gray-800 border border-indigo-100 dark:border-indigo-900/50 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <IndianRupee size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Grand Total</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-0.5">₹{summary.grandTotal.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Main Consolidated Table */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden" ref={printAreaRef}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/40 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[5%]">Sr.No</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[12%]">Category</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[20%]">Item Name / Lab</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[18%]">Details / Spec</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[15%]">Vendor / Supplier</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[10%]">Date</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[8%] text-center">Qty</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] w-[12%] text-right">Total Amount</th>
                <th className="p-4 font-black uppercase tracking-widest text-[10px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700 text-slate-600 dark:text-gray-300">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan="9" className="p-6 text-center text-slate-400">Compiling report data...</td>
                  </tr>
                ))
              ) : expenses.length > 0 ? (
                expenses.map((exp, idx) => {
                  const name = exp.equipmentName || exp.productName || exp.labName || 'Expense';
                  const detail = exp.brand ? `${exp.brand} ${exp.modelNumber || ''}`.trim() : (exp.category || exp.treatmentType || exp.workType || '-');
                  const vendorName = exp.vendor || exp.supplier || exp.labName || '-';
                  const date = exp.purchaseDate || exp.sentDate || exp.createdAt;

                  return (
                    <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 font-bold text-center text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          exp.expenseType === 'Equipment'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : exp.expenseType === 'Consumer Products'
                            ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                        }`}>
                          {exp.expenseType}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{name}</td>
                      <td className="p-4 font-medium text-slate-500">{detail}</td>
                      <td className="p-4 font-medium">{vendorName}</td>
                      <td className="p-4 font-semibold text-slate-500">{date ? new Date(date).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="p-4 font-bold text-center">{exp.quantity || 1}</td>
                      <td className="p-4 font-extrabold text-right text-slate-800 dark:text-white">₹{exp.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          exp.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : exp.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {exp.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    <Info size={24} className="mx-auto text-slate-300 mb-2" />
                    <span>No expense records match the specified filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Page Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-area {
            padding: 0 !important;
          }
          table {
            border: 1px solid #cbd5e1 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            border-bottom: 2px solid #94a3b8 !important;
          }
          td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ExpenseReports;
