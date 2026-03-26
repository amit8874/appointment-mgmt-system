import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const PrescriptionQuoteModal = ({ prescription, onClose, onSuccess }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageFull, setShowImageFull] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await pharmacyApi.getProducts();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  const addItem = (product) => {
    const existing = items.find(item => item.productId === product._id);
    if (existing) {
      setItems(items.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setItems([...items, { 
        productId: product._id, 
        name: product.name, 
        price: product.price, 
        quantity: 1 
      }]);
    }
    setSearchQuery('');
  };

  const removeItem = (productId) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setIsSubmitting(true);
      await pharmacyApi.createPrescriptionQuote(prescription._id, {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount
      });
      toast.success('Quote sent to patient!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send quote');
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
        className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex overflow-hidden border border-slate-100"
      >
        {/* Left Side: Prescription View */}
        <div className="w-1/2 bg-slate-50 border-r border-slate-100 p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Prescription View</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Uploaded by Patient</p>
            </div>
            <button 
                onClick={() => setShowImageFull(true)}
                className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm hover:scale-110 transition-transform"
            >
                <Eye size={20} />
            </button>
          </div>

          <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-inner relative group">
            <img 
              src={prescription.prescriptionUrl} 
              alt="Prescription" 
              className="w-full h-full object-contain p-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 mb-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile Number</p>
                <p className="font-black text-slate-800 tracking-tight">{prescription.mobileNumber || 'Not provided'}</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Method</p>
                <p className="font-black text-blue-600 tracking-tight uppercase">{prescription.deliveryMethod || 'Pickup'}</p>
            </div>
          </div>

          {prescription.deliveryAddress && prescription.deliveryMethod !== 'pickup' && (
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Address</p>
                <p className="font-bold text-slate-700 text-sm leading-tight">{prescription.deliveryAddress}</p>
            </div>
          )}

          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
            <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-2">Instructions</h4>
            <p className="text-xs font-bold text-blue-700 leading-relaxed italic">
                Analyze the prescription above and search for the required medicines from your inventory. 
                You can add multiple items and set quantities for a precise quote.
            </p>
          </div>
        </div>

        {/* Right Side: Quote Builder */}
        <div className="w-1/2 p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Create Quote</h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search Inventory */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items in your inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
            />
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2"
                >
                  {searchResults.map(product => (
                    <button
                      key={product._id}
                      onClick={() => addItem(product)}
                      className="w-full text-left p-4 hover:bg-slate-50 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{product.name}</p>
                        <p className="text-xs font-bold text-slate-400">Stock: {product.stock}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-900">₹{product.price}</span>
                        <Plus size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                <ShoppingBag size={48} />
                <p className="font-black uppercase tracking-widest text-xs">No items added to quote</p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.productId} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">{item.name}</h4>
                    <p className="text-xs font-bold text-blue-600 mt-1">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center bg-slate-50 rounded-xl p-1">
                    <button 
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 font-black"
                    >-</button>
                    <span className="w-8 text-center font-black text-slate-800 text-sm">{item.quantity}</span>
                    <button 
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 font-black"
                    >+</button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.productId)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: Summary & Submit */}
          <div className="pt-8 border-t border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Quote Total</span>
              <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{totalAmount}</span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Send Quote to Patient
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Full Image Preview */}
      <AnimatePresence>
        {showImageFull && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-10 cursor-zoom-out"
                onClick={() => setShowImageFull(false)}
            >
                <motion.img 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    src={prescription.prescriptionUrl} 
                    className="max-w-full max-h-full object-contain rounded-2xl"
                />
                <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
                    <X size={48} />
                </button>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PrescriptionQuoteModal;
