import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Save, Search, Calendar, UserPlus, Info, Truck, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

const PurchaseStock = ({ onAddMedicine }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [purchaseInfo, setPurchaseInfo] = useState({
    supplierId: '',
    purchaseInvoiceNo: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Unpaid',
    notes: ''
  });

  const [items, setItems] = useState([{
    medicineId: '',
    medicineName: '',
    batchNo: '',
    expiryDate: '',
    mrp: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 0,
    freeQuantity: 0,
    gstPercentage: 0,
    discountPercentage: 0,
    totalAmount: 0,
    showDropdown: false
  }]);

  useEffect(() => {
    fetchSuppliers();
    fetchMedicines();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/internal-pharmacy/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/internal-pharmacy/medicines/all');
      console.log('DEBUG: Fetched ALL medicines. Count:', response.data.length);
      console.log('DEBUG: First medicine sample:', response.data[0]);
      setMedicines(response.data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setItems([...items, {
      medicineId: '',
      medicineName: '',
      batchNo: '',
      expiryDate: '',
      mrp: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      quantity: 0,
      freeQuantity: 0,
      gstPercentage: 0,
      discountPercentage: 0,
      totalAmount: 0,
      showDropdown: false
    }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'medicineName') {
      const filteredCount = medicines.filter(m => 
        !value || m.name?.toLowerCase().includes(value.toLowerCase())
      ).length;
      console.log(`DEBUG: Typing "${value}". Matches found: ${filteredCount}`);
    }
    
    // Recalculate total for row
    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].purchasePrice) || 0;
    const gst = Number(newItems[index].gstPercentage) || 0;
    const disc = Number(newItems[index].discountPercentage) || 0;
    
    const subtotal = qty * price;
    const discAmount = subtotal * (disc / 100);
    const afterDisc = subtotal - discAmount;
    const gstAmount = afterDisc * (gst / 100);
    newItems[index].totalAmount = Number((afterDisc + gstAmount).toFixed(2));
    
    setItems(newItems);
  };

  const handleSelectMedicine = (index, med) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      medicineId: med._id,
      medicineName: med.name,
      batchNo: med.lastBatchNo || '',
      expiryDate: med.lastExpiryDate || '',
      mrp: med.lastMrp || 0,
      purchasePrice: med.lastPurchasePrice || 0,
      sellingPrice: med.lastSellingPrice || 0,
      gstPercentage: med.gstPercentage || 0,
      showDropdown: false
    };
    
    // Recalculate totals for the row
    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].purchasePrice) || 0;
    const gst = Number(newItems[index].gstPercentage) || 0;
    
    const subtotal = qty * price;
    const gstAmount = subtotal * (gst / 100);
    newItems[index].totalAmount = Number((subtotal + gstAmount).toFixed(2));
    
    setItems(newItems);
  };

  const calculateGrandTotal = () => {
    return items.reduce((acc, item) => acc + item.totalAmount, 0).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!purchaseInfo.supplierId || !purchaseInfo.purchaseInvoiceNo) {
      return alert('Supplier and Invoice No are required');
    }
    try {
      setLoading(true);
      await api.post('/internal-pharmacy/purchase', {
        ...purchaseInfo,
        items,
        totalAmount: calculateGrandTotal(),
        netAmount: calculateGrandTotal()
      });
      alert('Purchase recorded successfully!');
      // Reset form
      setPurchaseInfo({
        supplierId: '',
        purchaseInvoiceNo: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'Unpaid',
        notes: ''
      });
      setItems([{
        medicineId: '',
        medicineName: '',
        batchNo: '',
        expiryDate: '',
        mrp: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        quantity: 0,
        freeQuantity: 0,
        gstPercentage: 0,
        discountPercentage: 0,
        totalAmount: 0
      }]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Purchase Stock</h1>
          <p className="text-sm text-slate-500 font-medium">Record new stock purchases from suppliers</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Header Information */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 mb-1">
            <Truck className="w-4 h-4" />
            <h3 className="text-sm font-bold">Purchase Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Supplier Name *</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold"
                value={purchaseInfo.supplierId}
                onChange={(e) => setPurchaseInfo({...purchaseInfo, supplierId: e.target.value})}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Invoice No *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold"
                placeholder="INV-2024-001"
                value={purchaseInfo.purchaseInvoiceNo}
                onChange={(e) => setPurchaseInfo({...purchaseInfo, purchaseInvoiceNo: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold"
                value={purchaseInfo.purchaseDate}
                onChange={(e) => setPurchaseInfo({...purchaseInfo, purchaseDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Status</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold text-indigo-600"
                value={purchaseInfo.paymentStatus}
                onChange={(e) => setPurchaseInfo({...purchaseInfo, paymentStatus: e.target.value})}
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Purchase Items Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-slate-500" />
              Purchase Items
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={onAddMedicine}
                className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                + Create New Product
              </button>
              <button 
                onClick={addItemRow}
                className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item Row
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 dark:border-gray-700">
            <table className="w-full text-[11px] border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-gray-900 text-slate-500 font-black uppercase tracking-widest">
                <tr className="border-b border-slate-100 dark:border-gray-700">
                  <th className="px-3 py-3 text-left">Medicine Name</th>
                  <th className="px-3 py-3 text-left">Batch No</th>
                  <th className="px-3 py-3 text-left">Expiry</th>
                  <th className="px-3 py-3 text-center">MRP</th>
                  <th className="px-3 py-3 text-center">Price</th>
                  <th className="px-3 py-3 text-center">Qty</th>
                  <th className="px-3 py-3 text-center">Free</th>
                  <th className="px-3 py-3 text-center">GST %</th>
                  <th className="px-3 py-3 text-center">Total (₹)</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 min-w-[220px] relative">
                      <div className="relative">
                        <input 
                          type="text" 
                          autoComplete="off"
                          className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-slate-300 font-bold"
                          placeholder="Search medicine..."
                          value={item.medicineName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newItems = [...items];
                            newItems[index].medicineName = val;
                            newItems[index].showDropdown = true;
                            
                            // Log the filter for debugging
                            const matches = medicines.filter(m => !val || m.name?.toLowerCase().includes(val.toLowerCase()));
                            console.log(`DEBUG: Search "${val}" found ${matches.length} matches`);
                            
                            setItems(newItems);
                          }}
                          onFocus={() => {
                            console.log('DEBUG: Input focused');
                            const newItems = [...items];
                            newItems[index].showDropdown = true;
                            setItems(newItems);
                          }}
                        />
                        {item.showDropdown && (
                          <div className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 max-h-64 overflow-y-auto overflow-x-hidden">
                            <div className="p-2 border-b border-slate-50 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                              <span>Suggestions</span>
                              <button onClick={() => handleItemChange(index, 'showDropdown', false)}>Close</button>
                            </div>
                            {medicines
                              .filter(m => !item.medicineName || m.name?.toLowerCase().includes(item.medicineName?.toLowerCase()))
                              .slice(0, 50)
                              .map(med => (
                                <div 
                                  key={med._id}
                                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-slate-100 dark:border-gray-700 transition-colors"
                                  onClick={() => handleSelectMedicine(index, med)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{med.name}</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">{med.manufacturer} • {med.type} • {med.packSize}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] font-black text-indigo-600">MRP: ₹{med.mrp || 0}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase">GST: {med.gstPercentage || 0}%</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {medicines.filter(m => !item.medicineName || m.name?.toLowerCase().includes(item.medicineName?.toLowerCase())).length === 0 && (
                              <div className="p-8 text-center">
                                <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">No matching medicines</p>
                                <button onClick={onAddMedicine} className="mt-2 text-indigo-600 text-[10px] font-black uppercase underline">Create New</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <input 
                        type="text" 
                        placeholder="Batch"
                        autoComplete="off"
                        className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] outline-none font-bold"
                        value={item.batchNo}
                        onChange={(e) => handleItemChange(index, 'batchNo', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <input 
                        type="date" 
                        className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] outline-none font-bold"
                        value={item.expiryDate}
                        onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input 
                        type="number" 
                        className="w-full px-1 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] text-center outline-none font-bold text-indigo-600"
                        value={item.mrp}
                        onChange={(e) => handleItemChange(index, 'mrp', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <input 
                        type="number" 
                        className="w-full px-1 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] text-center outline-none font-bold"
                        value={item.purchasePrice}
                        onChange={(e) => handleItemChange(index, 'purchasePrice', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 w-16">
                      <input 
                        type="number" 
                        className="w-full px-1 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] text-center outline-none font-black text-slate-900"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 w-16">
                      <input 
                        type="number" 
                        className="w-full px-1 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] text-center outline-none font-bold text-slate-500"
                        value={item.freeQuantity}
                        onChange={(e) => handleItemChange(index, 'freeQuantity', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 w-16">
                      <input 
                        type="number" 
                        className="w-full px-1 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] text-center outline-none font-bold"
                        value={item.gstPercentage}
                        onChange={(e) => handleItemChange(index, 'gstPercentage', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <p className="text-[12px] font-black text-slate-800 dark:text-white">₹{item.totalAmount}</p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeItemRow(index)} className="p-2 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl gap-4 border border-slate-100 dark:border-gray-700">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes</label>
              <textarea 
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-300"
                rows="1"
                placeholder="Purchase notes..."
                value={purchaseInfo.notes}
                onChange={(e) => setPurchaseInfo({...purchaseInfo, notes: e.target.value})}
              ></textarea>
            </div>
            <div className="w-full md:w-56 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white">₹{calculateGrandTotal()}</span>
              </div>
              <button 
                disabled={loading}
                onClick={handleSubmit}
                className={`w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold shadow-sm hover:bg-slate-900 transition-all active:scale-95 uppercase tracking-wider text-xs flex items-center justify-center
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Recording...' : 'Record Purchase'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseStock;
