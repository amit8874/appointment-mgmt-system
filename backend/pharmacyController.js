
/**
 * @desc    Get pharmacy performance analytics
 * @route   GET /api/pharmacy/analytics
 * @access  Pharmacy
 */
export const getPharmacyAnalytics = async (req, res) => {
  try {
    const pharmacy = await getPharmacyByOwner(req.user.id);
    const pharmacyId = pharmacy._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      standardRevenue,
      prescriptionRevenue,
      orderStatusCounts,
      prescriptionStatusCounts,
      topProductsStd,
      topProductsPres,
      inventorySummary
    ] = await Promise.all([
      Order.aggregate([
        { $match: { pharmacyId, status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
      ]),
      PrescriptionOrder.aggregate([
        { $match: { pharmacyId, status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$quotedTotal" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
      ]),
      Order.aggregate([{ $match: { pharmacyId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      PrescriptionOrder.aggregate([{ $match: { pharmacyId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { pharmacyId, status: 'completed' } },
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtOrder"] } } } }
      ]),
      PrescriptionOrder.aggregate([
        { $match: { pharmacyId, status: 'completed' } },
        { $unwind: "$quotedItems" },
        { $group: { _id: "$quotedItems.productId", quantity: { $sum: "$quotedItems.quantity" }, revenue: { $sum: { $multiply: ["$quotedItems.quantity", "$quotedItems.price"] } } } }
      ]),
      Inventory.aggregate([
        { $match: { pharmacyId } },
        { $group: { _id: { $cond: [{ $lte: ["$stockLevel", 0] }, "Out of Stock", { $cond: [{ $lte: ["$stockLevel", 5] }, "Low Stock", "Healthy"] }] }, count: { $sum: 1 } } }
      ])
    ]);

    const revenueMap = {};
    const mergeData = (data) => {
      data.forEach(item => {
        if (!revenueMap[item._id]) revenueMap[item._id] = { day: item._id, revenue: 0, orders: 0 };
        revenueMap[item._id].revenue += (item.revenue || 0);
        revenueMap[item._id].orders += (item.count || 0);
      });
    };
    mergeData(standardRevenue);
    mergeData(prescriptionRevenue);
    const revenueTrend = Object.values(revenueMap).sort((a, b) => a.day.localeCompare(b.day));

    const statusMap = {};
    const mergeStatus = (data) => {
      data.forEach(item => {
        if (!statusMap[item._id]) statusMap[item._id] = 0;
        statusMap[item._id] += item.count;
      });
    };
    mergeStatus(orderStatusCounts);
    mergeStatus(prescriptionStatusCounts);
    const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const productMap = {};
    const mergeProducts = (data) => {
      data.forEach(item => {
        const id = item._id ? item._id.toString() : 'unknown';
        if (!productMap[id]) productMap[id] = { id, quantity: 0, revenue: 0 };
        productMap[id].quantity += item.quantity;
        productMap[id].revenue += item.revenue;
      });
    };
    mergeProducts(topProductsStd);
    mergeProducts(topProductsPres);

    const productIds = Object.keys(productMap).filter(id => id !== 'unknown' && mongoose.Types.ObjectId.isValid(id));
    const products = await Product.find({ _id: { $in: productIds } }, 'name');
    const productsWithName = products.map(p => ({
      name: p.name,
      quantity: productMap[p._id.toString()].quantity,
      revenue: productMap[p._id.toString()].revenue
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    res.json({
      revenueTrend,
      statusDistribution,
      topProducts: productsWithName,
      inventorySummary: inventorySummary.map(i => ({ name: i._id, value: i.count }))
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: error.message });
  }
};
