import Pharmacy from '../models/Pharmacy.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import PrescriptionOrder from '../models/PrescriptionOrder.js';
import { generateOrderId } from '../utils/idGenerator.js';

// Helper to get pharmacy by owner user ID
const getPharmacyByOwner = async (ownerId) => {
  const pharmacy = await Pharmacy.findOne({ ownerId });
  if (!pharmacy) {
    throw new Error('Pharmacy not found for this user');
  }
  return pharmacy;
};

/**
 * @desc    Get pharmacy dashboard statistics
 * @route   GET /api/pharmacy/dashboard/stats
 * @access  Pharmacy
 */
export const getDashboardStats = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const pharmacyId = pharmacy._id;

    const [
      newOrdersCount,
      lowStockCount,
      pendingPayout,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments({ pharmacyId, status: 'pending' }),
      Inventory.countDocuments({ pharmacyId, stockLevel: { $lte: 5 } }), // Reorder level logic
      Promise.resolve(pharmacy.balance || 0),
      Order.find({ pharmacyId })
        .populate('customerId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      stats: {
        newOrders: newOrdersCount,
        pendingPayout,
        lowStockItems: lowStockCount,
        avgProcessTime: '15m', // Mock for now, can be calculated from completed orders
      },
      recentOrders: recentOrders.map(order => ({
        id: order.orderId,
        patient: order.customerId?.name || 'Unknown',
        amount: `₹${order.totalAmount}`,
        status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        items: order.items.length > 0 ? 'Medicines' : 'Empty' // Simplified for list
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get pharmacy inventory
 * @route   GET /api/pharmacy/inventory
 * @access  Pharmacy
 */
export const getInventory = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const inventory = await Inventory.find({ pharmacyId: pharmacy._id })
      .populate('productId')
      .sort({ lastUpdated: -1 });
    
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Add product to inventory or update stock
 * @route   POST /api/pharmacy/inventory
 * @access  Pharmacy
 */
export const updateInventory = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const { productId, stockLevel, reorderLevel, locationInStore } = req.body;

    const inventory = await Inventory.findOneAndUpdate(
      { pharmacyId: pharmacy._id, productId },
      { 
        $set: { stockLevel, reorderLevel, locationInStore, lastUpdated: Date.now() } 
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Inventory updated successfully', inventory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get pharmacy orders
 * @route   GET /api/pharmacy/orders
 * @access  Pharmacy
 */
export const getOrders = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const { status } = req.query;
    
    const query = { pharmacyId: pharmacy._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customerId', 'name email mobile')
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update order status
 * @route   PATCH /api/pharmacy/orders/:id/status
 * @access  Pharmacy
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create a new product (Global or Pharmacy specific - here Global for simplicity)
 * @route   POST /api/pharmacy/products
 * @access  Pharmacy
 */
export const createProduct = async (req, res) => {
  try {
    const { name, description, category, price, manufacturer, sku } = req.body;
    
    const product = await Product.create({
      name, description, category, price, manufacturer, sku
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all products (for adding to inventory)
 * @route   GET /api/pharmacy/products
 * @access  Pharmacy
 */
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc    Search for medicines (Public/Patient)
 * @route   GET /api/pharmacy/medicines/search
 * @access  Public
 */
export const searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Find products matching the query
    const products = await Product.find({
      name: { $regex: q, $options: 'i' }
    }).limit(20);

    // Filter products that are actually in stock in at least one active pharmacy
    const productIds = products.map(p => p._id);
    const availableInventories = await Inventory.find({
      productId: { $in: productIds },
      stockLevel: { $gt: 0 }
    }).populate('pharmacyId', 'status');

    // Filter out products that have no active pharmacy with stock
    const activeProductIds = new Set(
      availableInventories
        .filter(inv => inv.pharmacyId?.status === 'active')
        .map(inv => inv.productId.toString())
    );

    const filteredProducts = products.filter(p => activeProductIds.has(p._id.toString()));

    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Auto-assign best pharmacy for a medicine (Smart Matching)
 * @route   POST /api/pharmacy/auto-assign
 * @access  Private (Patient/User)
 */
export const autoAssignOrder = async (req, res) => {
  try {
    const { productId, quantity = 1, pinCode } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Find all inventories for this product with enough stock
    const inventories = await Inventory.find({
      productId,
      stockLevel: { $gte: quantity }
    }).populate({
      path: 'pharmacyId',
      match: { status: 'active' },
      select: 'name address phone status'
    });

    // Filter out inventories where pharmacyId didn't match (due to population filter of active status)
    const activeInventories = inventories.filter(inv => inv.pharmacyId);

    if (activeInventories.length === 0) {
      return res.status(404).json({ message: 'No active pharmacy found with this medicine in stock' });
    }

    // Smart Matching Logic:
    // 1. Sort by PIN code match (Proximity)
    // 2. Sort by Stock Level (Tie-breaker)
    const sorted = activeInventories.sort((a, b) => {
      // 📍 Proximity check
      const aMatchesPin = a.pharmacyId.address?.zip === pinCode;
      const bMatchesPin = b.pharmacyId.address?.zip === pinCode;

      if (aMatchesPin && !bMatchesPin) return -1;
      if (!aMatchesPin && bMatchesPin) return 1;

      // 📦 Stock check (Higher stock first)
      return b.stockLevel - a.stockLevel;
    });

    const bestMatch = sorted[0];

    res.json({
      success: true,
      pharmacy: bestMatch.pharmacyId,
      inventory: {
        stockLevel: bestMatch.stockLevel,
        productId: bestMatch.productId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Broadcast a prescription to nearby pharmacies
 * @route   POST /api/pharmacy/prescriptions/broadcast
 * @access  Private (Patient/User)
 */
export const broadcastPrescription = async (req, res) => {
  try {
    const { prescriptionUrl, pinCode, mobileNumber, deliveryMethod, deliveryAddress } = req.body;
    
    // Support guest checkout by using mobileNumber if no user is authenticated
    const patientId = req.user ? (req.user._id || req.user.id) : `guest_${mobileNumber}`;

    if (!prescriptionUrl || !pinCode) {
      return res.status(400).json({ message: 'Prescription image and PIN code are required' });
    }

    const newBroadcast = await PrescriptionOrder.create({
      patientId,
      prescriptionUrl,
      pinCode,
      mobileNumber,
      deliveryMethod,
      deliveryAddress,
      status: 'broadcast'
    });

    res.status(201).json({
      success: true,
      message: 'Prescription broadcasted successfully to nearby pharmacies',
      order: newBroadcast
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get active broadcasts for a pharmacy's PIN code
 * @route   GET /api/pharmacy/prescriptions/broadcasts
 * @access  Private (Pharmacy)
 */
export const getBroadcastedOrders = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const pinCode = pharmacy.address?.zip;
    
    // If no pin code, return empty array instead of error to avoid crashing UI
    if (!pinCode) {
      return res.json([]);
    }

    // Find active broadcasts in the same city (match first 3 digits of PIN)
    const cityPrefix = pinCode.substring(0, 3);
    const orders = await PrescriptionOrder.find({
      pinCode: { $regex: `^${cityPrefix}` },
      status: 'broadcast'
    }).sort({ createdAt: -1 });

    // Move exact PIN matches to the top of the list
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.pinCode === pinCode && b.pinCode !== pinCode) return -1;
      if (a.pinCode !== pinCode && b.pinCode === pinCode) return 1;
      return 0;
    });

    res.json(sortedOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Accept a broadcasted prescription order
 * @route   POST /api/pharmacy/prescriptions/:id/accept
 * @access  Private (Pharmacy)
 */
export const acceptBroadcastedOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const pharmacy = await getPharmacyByOwner(req.user.id);

    // Atomically find the order and update if it's still in 'broadcast' status
    const order = await PrescriptionOrder.findOneAndUpdate(
      { _id: id, status: 'broadcast' },
      { 
        status: 'accepted',
        pharmacyId: pharmacy._id
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ 
        message: 'This order has already been accepted by another pharmacy or is no longer available' 
      });
    }

    res.json({
      success: true,
      message: 'Prescription order accepted successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all prescription orders (Accepted/Quoted) for a pharmacy
 * @route   GET /api/pharmacy/prescriptions/my-orders
 * @access  Private (Pharmacy)
 */
export const getPharmacyPrescriptions = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const prescriptions = await PrescriptionOrder.find({
      pharmacyId: pharmacy._id,
      status: { $in: ['accepted', 'quoted', 'paid'] }
    }).sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create a quote for an accepted prescription
 * @route   POST /api/pharmacy/prescriptions/:id/quote
 * @access  Private (Pharmacy)
 */
export const createPrescriptionQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalAmount } = req.body;

    const pharmacy = await getPharmacyByOwner(req.user.id);

    const order = await PrescriptionOrder.findOneAndUpdate(
      { _id: id, pharmacyId: pharmacy._id, status: 'accepted' },
      { 
        status: 'quoted',
        quotedItems: items,
        quotedTotal: totalAmount
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Prescription order not found or already quoted' });
    }

    res.json({
      success: true,
      message: 'Quote sent to patient successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all prescription orders for a patient
 * @route   GET /api/pharmacy/prescriptions/patient-orders
 * @access  Private (Patient)
 */
export const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await PrescriptionOrder.find({
      patientId: req.user._id || req.user.id
    })
    .populate('pharmacyId', 'name address phone')
    .populate('quotedItems.productId', 'name price')
    .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Confirm and pay for a prescription quote
 * @route   POST /api/pharmacy/prescriptions/:id/confirm
 * @access  Private (Patient)
 */
export const confirmPrescriptionOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Atomically move from quoted to paid
    const prescription = await PrescriptionOrder.findOneAndUpdate(
      { _id: id, patientId: req.user.id, status: 'quoted' },
      { status: 'paid' },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Quoted prescription not found or not in quoted status' });
    }

    // Convert to a formal Order
    const orderId = generateOrderId();
    const newOrder = await Order.create({
      orderId,
      pharmacyId: prescription.pharmacyId,
      customerId: prescription.patientId,
      items: prescription.quotedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtOrder: item.price
      })),
      totalAmount: prescription.quotedTotal,
      status: 'pending',
      paymentStatus: 'paid'
    });

    res.json({
      success: true,
      message: 'Order confirmed and paid successfully',
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get current pharmacy profile
 * @route   GET /api/pharmacy/profile
 * @access  Private (Pharmacy)
 */
export const getPharmacyProfile = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    res.json(pharmacy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update pharmacy profile
 * @route   PUT /api/pharmacy/profile
 * @access  Private (Pharmacy)
 */
export const updatePharmacyProfile = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const { name, phone, address } = req.body;

    if (name) pharmacy.name = name;
    if (phone) pharmacy.phone = phone;
    if (address) {
      pharmacy.address = {
        ...pharmacy.address,
        ...address
      };
    }

    await pharmacy.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      pharmacy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get status of a specific prescription order (Public/Guest)
 * @route   GET /api/pharmacy/prescriptions/:id/status
 * @access  Public
 */
export const getPrescriptionOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await PrescriptionOrder.findById(id)
      .populate('pharmacyId', 'name address phone')
      .populate('quotedItems.productId', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update status of a prescription order
 * @route   PUT /api/pharmacy/prescriptions/:id/status
 * @access  Private (Pharmacy)
 */
export const updatePrescriptionOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await PrescriptionOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order marked as ${status}`,
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

