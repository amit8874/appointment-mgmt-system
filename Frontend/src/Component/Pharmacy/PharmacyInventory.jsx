import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Package, 
  TrendingDown, 
  AlertCircle,
  Edit2,
  MoreVertical,
  Minus,
  Check,
  Upload,
  X,
  FileText,
  HelpCircle,
  FileSpreadsheet,
  History,
  ArrowDownToLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';
import MedicineUsageHistoryModal from './MedicineUsageHistoryModal';
import QuickDispenseModal from './QuickDispenseModal';

const PharmacyInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ id: null, value: '' });

  const [modalTab, setModalTab] = useState('single'); // 'single', 'bulk'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);
  const [selectedItemForQuickDispense, setSelectedItemForQuickDispense] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getInventory({
        page: currentPage,
        limit: 20,
        search: searchTerm
      });
      setInventory(data.inventory);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const data = await pharmacyApi.getProducts();
      setAllProducts(data);
    } catch (err) {
      console.error('Failed to load products');
    }
  };

  const handleUpdateStock = async (productId, currentStock) => {
    try {
      const newValue = stockUpdate.value === '' ? currentStock : parseInt(stockUpdate.value);
      await pharmacyApi.updateInventory({
        productId,
        stockLevel: newValue
      });
      toast.success('Stock updated');
      setStockUpdate({ id: null, value: '' });
      fetchInventory();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return toast.warning('Please select a file first');
    
    try {
      setIsUploading(true);
      const res = await pharmacyApi.bulkUploadInventory(selectedFile);
      
      const { added, updated, errors } = res.summary;
      toast.success(`Upload complete! ${added} new products, ${updated} items synced.`);
      
      if (errors && errors.length > 0) {
        toast.info(`${errors.length} rows had errors and were skipped.`);
      }

      setShowAddModal(false);
      setSelectedFile(null);
      setSearchTerm(''); // Clear search to show new items
      fetchInventory();
    } catch (err) {
      console.error('Upload Error:', err);
      toast.error(err.response?.data?.message || 'Bulk upload failed. Please check file format.');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size too large (max 5MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 font-medium">Manage your medical stock and reorder levels</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Items</p>
            <p className="text-2xl font-black text-slate-900">{inventory.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Low Stock</p>
            <p className="text-2xl font-black text-slate-900">{inventory.filter(i => i.stockLevel <= i.reorderLevel).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Out of Stock</p>
            <p className="text-2xl font-black text-slate-900">{inventory.filter(i => i.stockLevel === 0).length}</p>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Stock Level</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">History</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400">Loading inventory...</td></tr>
              ) : inventory.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                            <Package size={20} />
                        </div>
                        <button 
                            onClick={() => setSelectedItemForQuickDispense(item)}
                            className="text-left group/name"
                        >
                            <p className="font-black text-slate-900 group-hover/name:text-orange-600 transition-colors uppercase py-0">{item.productId?.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.productId?.manufacturer}</p>
                        </button>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {item.productId?.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {stockUpdate.id === item._id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          autoFocus
                          type="number" 
                          value={stockUpdate.value}
                          onChange={(e) => setStockUpdate({ ...stockUpdate, value: e.target.value })}
                          className="w-20 px-3 py-1.5 rounded-lg border border-indigo-200 focus:border-indigo-500 outline-none font-bold"
                        />
                        <button 
                          onClick={() => handleUpdateStock(item.productId?._id, item.stockLevel)}
                          className="p-2 bg-emerald-500 text-white rounded-lg"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black ${item.stockLevel <= item.reorderLevel ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.stockLevel}
                            <span className="text-xs text-slate-400 font-medium ml-1">units</span>
                        </span>
                        <button 
                          onClick={() => setStockUpdate({ id: item._id, value: item.stockLevel })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.stockLevel === 0 ? 'bg-red-50 text-red-600' :
                      item.stockLevel <= item.reorderLevel ? 'bg-orange-50 text-orange-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {item.stockLevel === 0 ? 'Out of Stock' :
                       item.stockLevel <= item.reorderLevel ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                            onClick={() => setSelectedItemForQuickDispense(item)}
                            className="p-3 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-2xl transition-all shadow-sm"
                            title="Quick Dispense"
                        >
                            <ArrowDownToLine size={18} />
                        </button>
                        <button 
                            onClick={() => setSelectedItemForHistory(item)}
                            className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm"
                            title="View History"
                        >
                            <History size={18} />
                        </button>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                        <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inventory.length === 0 && !loading && (
             <div className="py-20 text-center text-slate-400">
                <Package size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-bold">Inventory is empty</p>
                <p className="text-sm">Add products to your store to get started</p>
             </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Showing Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-600 bg-white shadow-sm hover:bg-slate-50'}`}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-indigo-600 bg-white border border-indigo-100 shadow-sm hover:bg-indigo-50'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal (Enhanced) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => !isUploading && setShowAddModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Add Products</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Populate your inventory</p>
                </div>
                {!isUploading && (
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Tabs Selector */}
              <div className="flex p-2 bg-slate-50 border-b border-slate-100">
                <button 
                  onClick={() => setModalTab('single')}
                  className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${modalTab === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Package size={16} /> Single Entry
                </button>
                <button 
                  onClick={() => setModalTab('bulk')}
                  className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${modalTab === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Upload size={16} /> Bulk Upload
                </button>
              </div>

              <div className="p-8">
                {modalTab === 'single' ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search global products..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                        onChange={(e) => setSearchTerm(e.target.value)} // Reusing search term for modal filter
                      />
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {allProducts
                        .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(product => (
                        <button
                          key={product._id}
                          onClick={() => {
                              handleUpdateStock(product._id, 10); // Default 10 units
                              setShowAddModal(false);
                          }}
                          className="w-full p-5 rounded-2xl border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-left flex justify-between items-center group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-50 flex items-center justify-center text-indigo-200 group-hover:text-indigo-400 transition-colors">
                              <Package size={24} />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 group-hover:text-indigo-900">{product.name}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{product.category} • ₹{product.price}</p>
                            </div>
                          </div>
                          <div className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              + Add
                          </div>
                        </button>
                      ))}
                      {allProducts.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">No global products found</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 py-4">
                    <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex items-start gap-4">
                      <HelpCircle size={24} className="text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wide mb-1">Upload Requirements</h4>
                        <p className="text-xs text-indigo-700 leading-relaxed font-bold">
                          Prepare your Excel (.xlsx) or CSV file with the following columns:
                          <span className="block mt-2 font-black text-indigo-900 opacity-70">
                            • Product Name (Required) • Category • Stock Level • Price • Manufacturer
                          </span>
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => !isUploading && fileInputRef.current.click()}
                      className={`relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer ${selectedFile ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-slate-50'}`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={onFileChange}
                        accept=".xlsx, .xls, .csv"
                        className="hidden" 
                      />
                      
                      <div className="flex flex-col items-center">
                        <div className={`p-6 rounded-3xl mb-4 ${selectedFile ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-300'}`}>
                          {selectedFile ? <FileSpreadsheet size={40} /> : <Upload size={40} />}
                        </div>
                        
                        {selectedFile ? (
                          <>
                            <p className="font-black text-slate-900 text-lg mb-1">{selectedFile.name}</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Ready to sync
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-black text-slate-900 text-lg mb-1">Click to browse your storage</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Supports .xlsx, .xls and .csv files</p>
                          </>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={handleBulkUpload}
                      disabled={!selectedFile || isUploading}
                      className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${selectedFile && !isUploading ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {isUploading ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="border-2 border-slate-300 border-t-white w-5 h-5 rounded-full" />
                          Processing File...
                        </>
                      ) : (
                        <>
                          <Check size={20} /> Start Bulk Sync
                        </>
                      )}
                    </button>
                    
                    {selectedFile && !isUploading && (
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="w-full text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-all"
                      >
                        Remove Selected File
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {selectedItemForHistory && (
          <MedicineUsageHistoryModal 
            product={selectedItemForHistory}
            onClose={() => setSelectedItemForHistory(null)}
          />
        )}
      </AnimatePresence>

      {/* Quick Dispense Modal */}
      <AnimatePresence>
        {selectedItemForQuickDispense && (
          <QuickDispenseModal
            item={selectedItemForQuickDispense}
            onClose={() => setSelectedItemForQuickDispense(null)}
            onSuccess={() => {
              fetchInventory();
              setSelectedItemForQuickDispense(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyInventory;
