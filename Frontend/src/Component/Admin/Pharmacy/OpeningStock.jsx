import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Trash2, Save, Calendar, Info, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

const OpeningStock = ({ onAddMedicine, medicine }) => {
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(medicine || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [batches, setBatches] = useState([{
    batchNo: '',
    expiryDate: '',
    mrp: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    unitType: 'Tablet'
  }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (medicine) {
      setSelectedMedicine(medicine);
    }
  }, [medicine]);

  useEffect(() => {
    searchMedicines();
  }, [searchTerm]);

  const searchMedicines = async () => {
    try {
      const response = await api.get(`/internal-pharmacy/inventory?search=${searchTerm}`);
      // Sort by name
      const sorted = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setMedicines(sorted);
    } catch (error) {
      console.error('Error searching medicines:', error);
    }
  };

  const addBatchRow = () => {
    setBatches([...batches, {
      batchNo: '',
      expiryDate: '',
      mrp: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      unitType: 'Tablet'
    }]);
  };

  const removeBatchRow = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
    }
  };

  const handleBatchChange = (index, field, value) => {
    const newBatches = [...batches];
    newBatches[index][field] = value;
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    if (!selectedMedicine) return alert('Select a medicine first');
    try {
      setLoading(true);
      await api.post('/internal-pharmacy/inventory/opening-stock', {
        medicineId: selectedMedicine._id,
        batches
      });
      alert('Opening stock added successfully!');
      setSelectedMedicine(null);
      setBatches([{
        batchNo: '',
        expiryDate: '',
        mrp: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        stockQuantity: 0,
        unitType: 'Tablet'
      }]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add opening stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="px-2">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Opening Stock Management</h1>
        <p className="text-sm text-slate-500 font-medium">Add current available stock for your medicines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Medicine Search Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Search Medicine</h3>
              <button 
                onClick={onAddMedicine}
                className="text-[9px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
              >
                + New
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Type medicine name..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {medicines.map((med) => (
                <button 
                  key={med._id}
                  onClick={() => setSelectedMedicine(med)}
                  className={`w-full p-3 rounded-lg text-left transition-all border ${selectedMedicine?._id === med._id ? 'border-slate-800 bg-slate-50 dark:bg-gray-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-gray-700/50'}`}
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{med.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{med.manufacturer}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Entry Area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedMedicine ? (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedMedicine.name}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedMedicine.manufacturer} • {selectedMedicine.type}</p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-gray-900 px-4 py-2 rounded-lg border border-slate-100 dark:border-gray-700">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white">{selectedMedicine.totalStock || 0}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Batch-wise Stock</h3>
                  <button 
                    onClick={addBatchRow}
                    className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center hover:bg-slate-50 px-2 py-1 rounded border border-slate-200 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-gray-700">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-gray-900">
                      <tr className="text-[9px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-gray-700">
                        <th className="px-3 py-2.5 text-left font-bold">Batch No *</th>
                        <th className="px-3 py-2.5 text-left font-bold">Expiry Date *</th>
                        <th className="px-3 py-2.5 text-center font-bold">MRP</th>
                        <th className="px-3 py-2.5 text-center font-bold">Purchase</th>
                        <th className="px-3 py-2.5 text-center font-bold">Selling</th>
                        <th className="px-3 py-2.5 text-center font-bold">Qty *</th>
                        <th className="px-3 py-2.5 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                      {batches.map((batch, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 min-w-[100px]">
                            <input 
                              type="text" 
                              placeholder="Batch No"
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs outline-none focus:ring-1 focus:ring-slate-300"
                              value={batch.batchNo}
                              onChange={(e) => handleBatchChange(index, 'batchNo', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 min-w-[130px]">
                            <input 
                              type="date" 
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs outline-none"
                              value={batch.expiryDate}
                              onChange={(e) => handleBatchChange(index, 'expiryDate', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 w-20">
                            <input 
                              type="number" 
                              className="w-full px-1 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs text-center outline-none"
                              value={batch.mrp}
                              onChange={(e) => handleBatchChange(index, 'mrp', e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 w-20">
                            <input 
                              type="number" 
                              className="w-full px-1 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs text-center outline-none"
                              value={batch.purchasePrice}
                              onChange={(e) => handleBatchChange(index, 'purchasePrice', e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 w-20">
                            <input 
                              type="number" 
                              className="w-full px-1 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs text-center outline-none"
                              value={batch.sellingPrice}
                              onChange={(e) => handleBatchChange(index, 'sellingPrice', e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 w-20">
                            <input 
                              type="number" 
                              className="w-full px-1 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-xs text-center outline-none font-bold"
                              value={batch.stockQuantity}
                              onChange={(e) => handleBatchChange(index, 'stockQuantity', e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => removeBatchRow(index)} className="p-1 text-rose-400 hover:text-rose-600 rounded transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-gray-700 gap-3">
                <button 
                  onClick={() => setSelectedMedicine(null)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading}
                  onClick={handleSubmit}
                  className={`px-6 py-2.5 bg-slate-800 text-white rounded-lg font-bold shadow transition-all active:scale-95 uppercase tracking-wider text-xs
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Save className="w-3.5 h-3.5 mr-2 inline-block" />
                  {loading ? 'Saving...' : 'Update Opening Stock'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 flex flex-col items-center justify-center text-center p-8">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Select a medicine from the list to add stock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpeningStock;
