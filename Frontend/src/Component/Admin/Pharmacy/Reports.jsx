import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import api from '../../../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('Purchase Report'); // 'Purchase Report' or 'Sales Report'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType, filters.startDate, filters.endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/internal-pharmacy/reports?type=${reportType}&startDate=${filters.startDate}&endDate=${filters.endDate}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const searchVal = filters.search.toLowerCase();
    if (reportType === 'Purchase Report') {
      return (
        item.purchaseInvoiceNo?.toLowerCase().includes(searchVal) ||
        item.supplierId?.name?.toLowerCase().includes(searchVal)
      );
    } else {
      return (
        item.billNo?.toLowerCase().includes(searchVal) ||
        item.patientName?.toLowerCase().includes(searchVal) ||
        item.patientPhone?.includes(searchVal)
      );
    }
  });

  const totalAmount = filteredData.reduce((sum, item) => sum + (item.amount || item.netAmount || item.grandTotal || item.totalAmount || 0), 0);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Pharmacy Reports</h1>
          <p className="text-sm text-slate-500 font-medium">Detailed insights into your pharmacy transactions</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <button 
            onClick={() => setReportType('Purchase Report')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${reportType === 'Purchase Report' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            PURCHASE REPORT
          </button>
          <button 
            onClick={() => setReportType('Sales Report')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${reportType === 'Sales Report' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            SALES REPORT
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
              {reportType === 'Purchase Report' ? <ShoppingCart className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total {reportType === 'Purchase Report' ? 'Purchases' : 'Sales'}</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">₹{totalAmount.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Count</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{filteredData.length}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Transaction Value</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">₹{(filteredData.length > 0 ? (totalAmount / filteredData.length) : 0).toFixed(0)}</h3>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-slate-100 dark:border-gray-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />
          <span className="text-slate-300 font-bold">to</span>
          <input 
            type="date" 
            className="bg-transparent border-none text-xs font-bold outline-none focus:ring-0"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Search by ${reportType === 'Purchase Report' ? 'Invoice No or Supplier' : 'Bill No or Patient'}...`}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>

        <button 
          onClick={fetchReport}
          className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button className="flex items-center px-4 py-2.5 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-900 transition-all text-xs font-black uppercase tracking-widest">
          <Download className="w-4 h-4 mr-2" /> Export
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {reportType === 'Purchase Report' ? 'Invoice & Supplier' : 'Bill & Patient'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-8"><div className="h-3 bg-slate-100 dark:bg-gray-700 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredData.length > 0 ? filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-all group">
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800 dark:text-white">
                        {new Date(item.purchaseDate || item.date).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(item.purchaseDate || item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                        {item.purchaseInvoiceNo || item.billNo}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        {item.supplierId?.name || item.patientName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                      ${(item.paymentStatus === 'Paid' || item.status === 'Completed') 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {item.paymentStatus || item.status || 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{(item.amount || item.netAmount || item.grandTotal || item.totalAmount || 0).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleViewDetails(item)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
                      <p className="text-xs text-slate-300 mt-2">Adjust your filters or try a different date range</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 dark:border-gray-700">
            <div className="p-6 border-b border-slate-50 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Transaction Details
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Invoice: {selectedRecord.purchaseInvoiceNo || selectedRecord.billNo}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-3 bg-slate-50 dark:bg-gray-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              {/* Info Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier / Patient</p>
                  <p className="text-base font-black text-slate-900 dark:text-white uppercase">
                    {selectedRecord.supplierId?.name || selectedRecord.patientName}
                  </p>
                  <p className="text-xs font-bold text-slate-500">{selectedRecord.patientPhone || 'No contact info'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {new Date(selectedRecord.purchaseDate || selectedRecord.date).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                  <p className="text-2xl font-black text-indigo-600">
                    ₹{(selectedRecord.netAmount || selectedRecord.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
                  Line Items
                </h4>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-3xl border border-slate-100 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-gray-700">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicine</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Batch</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50">
                      {(selectedRecord.items || selectedRecord.medicines || selectedRecord.billingItems || []).map((item, idx) => {
                        const qty = item.qty || item.quantity || 0;
                        const price = item.unitPrice || item.sellingPrice || item.purchasePrice || item.price || item.mrp || 0;
                        const lineTotal = item.subtotal || item.totalAmount || item.amount || (qty * price);
                        
                        return (
                          <tr key={idx} className="text-sm">
                            <td className="px-6 py-4 font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                              {item.description || item.medicineName || item.name}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-500 uppercase">{item.batchNo || 'N/A'}</td>
                            <td className="px-6 py-4 text-center font-black text-slate-800 dark:text-white">{qty}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-600">₹{price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">₹{lineTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-3 bg-slate-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-slate-100 dark:border-gray-700">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Subtotal</span>
                    <span>₹{(selectedRecord.grossAmount || selectedRecord.subtotal || selectedRecord.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-500 uppercase">
                    <span>GST Amount</span>
                    <span>+ ₹{(selectedRecord.gstAmount || selectedRecord.taxAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-rose-500 uppercase">
                    <span>Discount</span>
                    <span>- ₹{(selectedRecord.discount || selectedRecord.discountAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-gray-600 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Net Amount</span>
                    <span className="text-xl font-black text-indigo-600">₹{(selectedRecord.amount || selectedRecord.netAmount || selectedRecord.grandTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
