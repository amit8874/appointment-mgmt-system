import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  XSquare, 
  Printer, 
  Search,
  User,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const POSBilling = () => {
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [patientInfo, setPatientInfo] = useState({ name: 'Walk-in Patient', id: 'WALKIN' });
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scanInputRef = useRef(null);

  // Auto-focus barcode input
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.activeElement.tagName !== 'INPUT') {
        scanInputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Barcode Scan
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();
    setBarcodeInput('');

    // 1. Check if already in cart
    const existingIndex = cart.findIndex(item => item.barcode === barcode);
    if (existingIndex !== -1) {
      updateQuantity(existingIndex, 1);
      toast.success('Quantity updated');
      return;
    }

    // 2. Fetch from Backend
    try {
      const response = await axios.get(`/api/products/barcode/${barcode}`);
      const product = response.data;
      
      setCart(prev => [...prev, {
        productId: product._id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        tax: product.tax || 0,
        qty: 1
      }]);
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      toast.error('Product not found or unknown barcode');
      console.error('Scan error:', error);
    }
  };

  const updateQuantity = (index, delta) => {
    setCart(prev => {
      const newCart = [...prev];
      const newQty = (newCart[index].qty || 1) + delta;
      if (newQty <= 0) {
        newCart.splice(index, 1);
      } else {
        newCart[index].qty = newQty;
      }
      return newCart;
    });
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = cart.reduce((sum, item) => sum + ((item.price * item.qty * item.tax) / 100), 0);
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        patientName: patientInfo.name,
        patientId: patientInfo.id,
        items: cart.map(item => ({ productId: item.productId, qty: item.qty })),
        discount,
        paymentMethod,
        notes: 'POS Transaction'
      };

      const response = await axios.post('/api/billing/pos', payload);
      toast.success('Billing completed successfully!');
      
      // Reset POS
      setCart([]);
      setDiscount(0);
      setPatientInfo({ name: 'Walk-in Patient', id: 'WALKIN' });
      
      // Auto-trigger print if needed
      // window.open(`/print/invoice/${response.data._id}`, '_blank');
    } catch (error) {
      toast.error('Payment failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden p-4 gap-4 font-sans">
      
      {/* Left Column: Cart & Scanning */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Top Header: Scanner & Search */}
        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center gap-4">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
            <input 
              ref={scanInputRef}
              autoFocus
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode (Code128 / EAN)..."
              className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </form>
          
          <div className="relative w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Manual Search..."
              className="w-full bg-gray-700 border border-gray-600 rounded-xl pl-10 pr-4 py-3 outline-none focus:bg-gray-600 transition-all"
            />
          </div>
        </div>

        {/* Cart Listing */}
        <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="text-green-400" /> Current Bill
            </h2>
            <span className="text-gray-400 text-sm">{cart.length} items</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <Barcode className="w-16 h-16 opacity-20" />
                <p className="text-lg">Please scan a product to start</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all group">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{item.barcode}</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700">
                      <button onClick={() => updateQuantity(index, -1)} className="p-1 hover:bg-gray-700 rounded transition-colors text-red-400">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-lg">{item.qty}</span>
                      <button onClick={() => updateQuantity(index, 1)} className="p-1 hover:bg-gray-700 rounded transition-colors text-green-400">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-right w-24">
                      <p className="text-sm text-gray-500">₹{item.price.toFixed(2)}</p>
                      <p className="font-bold text-lg">₹{(item.price * item.qty).toFixed(2)}</p>
                    </div>
                    
                    <button onClick={() => updateQuantity(index, -item.qty)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Totals & Checkout */}
      <div className="w-96 flex flex-col gap-4">
        
        {/* Patient Selection */}
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Customer Details</h3>
          <div className="flex items-center gap-3 bg-gray-700 p-3 rounded-xl border border-gray-600">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{patientInfo.name}</p>
              <p className="text-xs text-gray-400">ID: {patientInfo.id}</p>
            </div>
          </div>
        </div>

        {/* Totals Section */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-2xl flex-1 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">Summary</h3>
          
          <div className="space-y-4 text-gray-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST / Tax</span>
              <span className="font-medium text-blue-400">+ ₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Discount</span>
              <div className="flex items-center gap-2">
                <span className="text-red-400">-</span>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-red-400 focus:border-red-500 outline-none"
                />
              </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-gray-700/50">
              <div className="flex justify-between items-end mb-8">
                <span className="text-lg font-bold">Total Amount</span>
                <div className="text-right">
                  <p className="text-4xl font-black text-white tracking-tighter">₹{total.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Tax Inclusive</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-gray-500">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'Card', 'UPI', 'UPI'].map((method, i) => (
                    <button 
                      key={i}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 px-4 rounded-xl border font-bold transition-all ${
                        paymentMethod === method 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_-5px_#2563eb]' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-3">
            <button 
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 py-5 rounded-2xl text-xl font-black shadow-lg hover:shadow-[0_0_20px_-5px_#10b981] transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <CreditCard className="w-6 h-6" /> 
              {isProcessing ? 'PROCESSING...' : 'COMPLETE BILL'}
            </button>
            <button 
              onClick={() => { if(window.confirm('Clear all items?')) setCart([]) }}
              className="w-full bg-transparent hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 text-gray-500 hover:text-red-400 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <XSquare className="w-4 h-4" /> CLEAR ALL
            </button>
          </div>
        </div>

        {/* Shortcuts Hint */}
        <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-300/80 leading-relaxed">
            <span className="font-bold text-blue-400">POS TIP:</span> Always keep the scanner focused on the main screen. The system auto-detects internal Code128 and external EAN/UPC barcodes.
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSBilling;
