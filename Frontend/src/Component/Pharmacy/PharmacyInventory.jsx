import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Package, 
  TrendingDown, 
  AlertCircle,
  Edit2,
  MoreVertical,
  Minus,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const PharmacyInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ id: null, value: '' });

  useEffect(() => {
    fetchInventory();
    fetchAllProducts();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getInventory();
      setInventory(data);
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

  const filteredInventory = inventory.filter(item => 
    item.productId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productId?.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center text-slate-400">Loading inventory...</td></tr>
              ) : filteredInventory.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="font-black text-slate-900">{item.productId?.name}</p>
                            <p className="text-xs text-slate-400 font-bold tracking-tight">{item.productId?.manufacturer}</p>
                        </div>
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
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                        <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && !loading && (
             <div className="py-20 text-center text-slate-400">
                <Package size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-bold">Inventory is empty</p>
                <p className="text-sm">Add products to your store to get started</p>
             </div>
          )}
        </div>
      </div>

      {/* Add Product Modal (Simplified) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-6">Add to Inventory</h2>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {allProducts.map(product => (
                  <button
                    key={product._id}
                    onClick={() => {
                        handleUpdateStock(product._id, 10); // Default 10 units
                        setShowAddModal(false);
                    }}
                    className="w-full p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex justify-between items-center group"
                  >
                    <div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-700">{product.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{product.category} • ₹{product.price}</p>
                    </div>
                    <Plus size={20} className="text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-full mt-6 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyInventory;
