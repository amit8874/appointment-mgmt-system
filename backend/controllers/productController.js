import Product from '../models/Product.js';

// Get all products for an organization
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ organizationId: req.tenantId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product by barcode (Fast lookup for POS)
export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await Product.findOne({ 
      organizationId: req.tenantId, 
      barcode: barcode 
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found with this barcode' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, barcode, price, tax, stock, category, description, sku, manufacturer } = req.body;

    // Auto-generate barcode if not provided (Code128 style: CLINIC-XXXX)
    let finalBarcode = barcode;
    if (!finalBarcode) {
      const count = await Product.countDocuments({ organizationId: req.tenantId });
      finalBarcode = `CLINIC-${String(count + 1).padStart(6, '0')}`;
    }

    const newProduct = new Product({
      organizationId: req.tenantId,
      name,
      barcode: finalBarcode,
      price,
      tax: tax || 0,
      stock: stock || 0,
      category,
      description,
      sku,
      manufacturer
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Barcode or SKU already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.tenantId },
      req.body,
      { new: true }
    );

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, organizationId: req.tenantId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
