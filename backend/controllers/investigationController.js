import InvestigationMaster from '../models/InvestigationMaster.js';

/**
 * @desc    Get all investigation master items
 * @route   GET /api/investigations/master
 */
export const getInvestigationMaster = async (req, res) => {
  try {
    const investigations = await InvestigationMaster.find().sort({ name: 1 });
    res.json(investigations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Search investigations
 * @route   GET /api/investigations/search
 */
export const searchInvestigations = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q 
      ? { 
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { keywords: { $in: [new RegExp(q, 'i')] } }
          ] 
        } 
      : {};
    
    const investigations = await InvestigationMaster.find(query).limit(20);
    res.json(investigations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Add new investigation to master
 * @route   POST /api/investigations/master
 */
export const addInvestigationMaster = async (req, res) => {
  try {
    const { name, category, keywords } = req.body;
    
    // Case-insensitive check
    const existing = await InvestigationMaster.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.json(existing); // Return existing instead of error to avoid frontend break
    }

    const newInvestigation = await InvestigationMaster.create({
      name,
      category,
      keywords,
      organizationId: req.tenantId || req.user?.organizationId
    });

    res.status(201).json(newInvestigation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Seed common investigations
 */
export const seedInvestigationMaster = async () => {
  try {
    const count = await InvestigationMaster.countDocuments();
    if (count > 0) return;

    const commonTests = [
      { name: 'Complete Blood Count (CBC)', category: 'Blood Test', keywords: ['cbc', 'blood count'] },
      { name: 'Liver Function Test (LFT)', category: 'Blood Test', keywords: ['lft', 'liver'] },
      { name: 'Kidney Function Test (KFT)', category: 'Blood Test', keywords: ['kft', 'kidney'] },
      { name: 'Lipid Profile', category: 'Blood Test', keywords: ['cholesterol', 'fats'] },
      { name: 'Blood Sugar Fasting', category: 'Diabetes', keywords: ['sugar', 'glucose'] },
      { name: 'Blood Sugar Random', category: 'Diabetes', keywords: ['sugar', 'glucose'] },
      { name: 'HbA1c', category: 'Diabetes', keywords: ['avg sugar'] },
      { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Hormones', keywords: ['thyroid'] },
      { name: 'Urine Routine', category: 'Pathology', keywords: ['urine'] },
      { name: 'Chest X-Ray', category: 'Radiology', keywords: ['xray', 'chest'] },
      { name: 'USG Whole Abdomen', category: 'Radiology', keywords: ['ultrasound', 'sonography'] },
      { name: 'ECG', category: 'Cardiology', keywords: ['heart', 'electrocardiogram'] }
    ];

    await InvestigationMaster.insertMany(commonTests);
    console.log('--- Investigation Master Seeded ---');
  } catch (error) {
    console.error('Error seeding investigations:', error);
  }
};
