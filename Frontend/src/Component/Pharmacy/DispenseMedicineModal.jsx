import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Package, 
  Minus, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const DispenseMedicineModal = ({ order, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const data = await pharmacyApi.getInventory({ search: searchQuery, limit: 10 });
      setSearchResults(data.inventory || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDispense = async () => {
    if (!selectedProduct || quantity <= 0) return;

    try {
      setIsSubmitting(true);
      const res = await pharmacyApi.dispenseMedicine({
        productId: selectedProduct.productId._id,
        quantity,
        orderId: order._id
      });

      setDispenseSuccess(res.data);
      toast.success('Inventory updated and order marked as ready!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispensing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dispensing Center</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Order Fulfillment & Inventory Sync</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">
          {!dispenseSuccess ? (
            <>
              {/* Search Section */}
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Search Your Inventory</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Type medicine name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                  />
                  {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />}
                </div>

                {/* Results Dropdown */}
                <AnimatePresence>
                  {searchResults.length > 0 && !selectedProduct && (
                    <motion.div 
                      className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-xl p-2 space-y-1"
                    >
                      {searchResults.map(item => (
                        <button
                          key={item._id}
                          onClick={() => {
                            setSelectedProduct(item);
                            setSearchResults([]);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-black text-slate-800 group-hover:text-blue-700 uppercase p-0">{item.productId.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.productId.category}</p>
                          </div>
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Stock: {item.stockLevel}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selection View */}
              {selectedProduct && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Package size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight leading-none">{selectedProduct.productId.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Current Stock: {selectedProduct.stockLevel} units</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedProduct(null)} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Change</button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity to Dispense</label>
                        <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><Minus size={16} /></button>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full text-center font-black text-slate-900 outline-none"
                            />
                            <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><Plus size={16} /></button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Balance</label>
                        <div className="flex items-center justify-center h-[58px] bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <span className={`text-xl font-black ${selectedProduct.stockLevel - quantity < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {selectedProduct.stockLevel - quantity}
                            </span>
                        </div>
                    </div>
                  </div>

                  {selectedProduct.stockLevel - quantity < 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
                        <AlertCircle size={14} />
                        <p className="text-[10px] font-black uppercase">Insufficient stock for this amount</p>
                    </div>
                  )}
                </motion.div>
              )}

              <button
                disabled={!selectedProduct || isSubmitting || (selectedProduct?.stockLevel - quantity < 0)}
                onClick={handleDispense}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirm Dispensing</>}
              </button>
            </>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dispense Successful!</h3>
                <p className="text-slate-500 font-medium">Inventory has been updated and order is now marked as ready.</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remaining Stock</p>
                    <p className="text-2xl font-black text-slate-900">{dispenseSuccess.remainingStock} <span className="text-xs text-slate-400 opacity-50">units</span></p>
                </div>
                <ArrowRight size={24} className="text-slate-200" />
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Status</p>
                    <p className="text-lg font-black text-emerald-600">READY</p>
                </div>
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Closing automatically...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DispenseMedicineModal;
