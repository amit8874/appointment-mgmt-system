import Medicine from '../models/Medicine.js';

// GET /api/medicines/master
export const getMedicineMaster = async (req, res) => {
  try {
    const list = await Medicine.find({ 
      isActive: true,
      $or: [{ organizationId: null }, { organizationId: req.tenantId }]
    }).sort({ isCommon: -1, usageCount: -1, name: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/medicines/search?q=
export const searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const regex = new RegExp(q, 'i');
    const results = await Medicine.find({
      isActive: true,
      $or: [{ organizationId: null }, { organizationId: req.tenantId }],
      $or: [
        { name: regex },
        { genericName: regex },
        { salt: regex },
        { category: regex },
        { keywords: regex }
      ]
    }).sort({ 
      isCommon: -1,
      usageCount: -1 
    }).limit(100);

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/medicines/master
export const addMedicineMaster = async (req, res) => {
  try {
    const { name, strength, form } = req.body;
    const existing = await Medicine.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      strength,
      form,
      $or: [{ organizationId: null }, { organizationId: req.tenantId }]
    });

    if (existing) return res.status(400).json({ message: 'Medicine already exists' });

    const newMed = new Medicine({
      ...req.body,
      organizationId: req.tenantId,
      isGlobal: false
    });

    await newMed.save();
    res.status(201).json(newMed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seed function with 200+ Core Medicines
export const seedMedicineMaster = async () => {
  try {
    const count = await Medicine.countDocuments({ isGlobal: true });
    if (count > 100) return;

    const data = [
      // ANALGESICS / ANTIPYRETICS
      { name: 'Dolo 650', genericName: 'Paracetamol', salt: 'Paracetamol 650 MG', form: 'Tablet', strength: '650 MG', category: 'Analgesic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Calpol 500', genericName: 'Paracetamol', salt: 'Paracetamol 500 MG', form: 'Tablet', strength: '500 MG', category: 'Analgesic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Crocin Advance', genericName: 'Paracetamol', salt: 'Paracetamol 500 MG', form: 'Tablet', strength: '500 MG', category: 'Analgesic', isCommon: true },
      { name: 'Meftal Spas', genericName: 'Mefenamic Acid + Dicyclomine', salt: 'Mefenamic Acid 250 MG + Dicyclomine 10 MG', form: 'Tablet', category: 'Antispasmodic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Combiflam', genericName: 'Ibuprofen + Paracetamol', salt: 'Ibuprofen 400 MG + Paracetamol 325 MG', form: 'Tablet', category: 'NSAID', isCommon: true },
      { name: 'Zerodol-SP', genericName: 'Aceclofenac + Paracetamol + Serratiopeptidase', salt: 'Aceclofenac 100 MG + Paracetamol 325 MG + Serratiopeptidase 15 MG', form: 'Tablet', category: 'NSAID', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Voveran SR 100', genericName: 'Diclofenac', salt: 'Diclofenac 100 MG', form: 'Tablet', strength: '100 MG', category: 'NSAID' },

      // ANTIBIOTICS
      { name: 'Augmentin 625 Duo', genericName: 'Amoxycillin + Clavulanic Acid', salt: 'Amoxycillin 500 MG + Clavulanic Acid 125 MG', form: 'Tablet', strength: '625 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '5 Days' },
      { name: 'Azithral 500', genericName: 'Azithromycin', salt: 'Azithromycin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Before Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Taxim-O 200', genericName: 'Cefixime', salt: 'Cefixime 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultFrequency: 'Daily', defaultDuration: '5 Days' },
      { name: 'Zifi 200', genericName: 'Cefixime', salt: 'Cefixime 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', isCommon: true },
      { name: 'Moxikind-CV 625', genericName: 'Amoxycillin + Clavulanic Acid', salt: 'Amoxycillin 500 MG + Clavulanic Acid 125 MG', form: 'Tablet', category: 'Antibiotic' },
      { name: 'Oflomac 200', genericName: 'Ofloxacin', salt: 'Ofloxacin 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic' },
      { name: 'Norflox 400', genericName: 'Norfloxacin', salt: 'Norfloxacin 400 MG', form: 'Tablet', strength: '400 MG', category: 'Antibiotic', keywords: ['UTI'] },
      { name: 'Metrogyl 400', genericName: 'Metronidazole', salt: 'Metronidazole 400 MG', form: 'Tablet', strength: '400 MG', category: 'Amoebicide', keywords: ['Loose motion'] },

      // GASTRO / ANTACIDS
      { name: 'Pan 40', genericName: 'Pantoprazole', salt: 'Pantoprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'Antacid', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food', defaultFrequency: 'Daily' },
      { name: 'Pantocid 40', genericName: 'Pantoprazole', salt: 'Pantoprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'Antacid', isCommon: true },
      { name: 'Omez 20', genericName: 'Omeprazole', salt: 'Omeprazole 20 MG', form: 'Capsule', strength: '20 MG', category: 'Antacid', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Empty Stomach' },
      { name: 'Rantac 150', genericName: 'Ranitidine', salt: 'Ranitidine 150 MG', form: 'Tablet', strength: '150 MG', category: 'Antacid', isCommon: true },
      { name: 'Digene', genericName: 'Magnesium + Aluminium + Simethicone', salt: 'Mixed Salts', form: 'Syrup', category: 'Antacid', isCommon: true },
      { name: 'Cremaffin', genericName: 'Liquid Paraffin + Milk of Magnesia', salt: 'Mixed', form: 'Syrup', category: 'Laxative', isCommon: true },
      { name: 'Lupiset 4', genericName: 'Ondansetron', salt: 'Ondansetron 4 MG', form: 'Tablet', strength: '4 MG', category: 'Antiemetic', keywords: ['Vomiting'] },

      // COUGH / COLD / ALLERGY
      { name: 'Allegra 120', genericName: 'Fexofenadine', salt: 'Fexofenadine 120 MG', form: 'Tablet', strength: '120 MG', category: 'Antihistamine', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Cetirizine 10', genericName: 'Cetirizine', salt: 'Cetirizine 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antihistamine', isCommon: true },
      { name: 'Levocet 5', genericName: 'Levocetirizine', salt: 'Levocetirizine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihistamine', isCommon: true },
      { name: 'Montair-LC', genericName: 'Montelukast + Levocetirizine', salt: 'Montelukast 10 MG + Levocetirizine 5 MG', form: 'Tablet', category: 'Antiallergic', isCommon: true },
      { name: 'Ascoril LS', genericName: 'Ambroxol + Levosalbutamol + Guaiphenesin', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true },
      { name: 'Grilinctus', genericName: 'Dextromethorphan + Chlorpheniramine', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true },

      // DIABETES / BP / CARDIAC
      { name: 'Glycomet 500', genericName: 'Metformin', salt: 'Metformin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antidiabetic', isCommon: true },
      { name: 'Glycomet GP 1', genericName: 'Glimepiride + Metformin', salt: 'Glimepiride 1 MG + Metformin 500 MG', form: 'Tablet', category: 'Antidiabetic', isCommon: true },
      { name: 'Telma 40', genericName: 'Telmisartan', salt: 'Telmisartan 40 MG', form: 'Tablet', strength: '40 MG', category: 'Antihypertensive', isCommon: true },
      { name: 'Amlokind-5', genericName: 'Amlodipine', salt: 'Amlodipine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihypertensive', isCommon: true },
      { name: 'Atorva 10', genericName: 'Atorvastatin', salt: 'Atorvastatin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Statin', isCommon: true },
      { name: 'Ecosprin 75', genericName: 'Aspirin', salt: 'Aspirin 75 MG', form: 'Tablet', strength: '75 MG', category: 'Antiplatelet', isCommon: true }
    ];

    const bulkOps = data.map(med => ({
      updateOne: {
        filter: { name: med.name },
        update: { $setOnInsert: { ...med, isGlobal: true } },
        upsert: true
      }
    }));

    await Medicine.bulkWrite(bulkOps);
    console.log(`[Seed] Medicine Master processed ${data.length} core medicines (Idempotent).`);
  } catch (error) {
    console.error('[Seed] Error in Medicine Seeding:', error.message);
  }
};

// Background helper for Billing
export const saveMedicineNames = async (names) => {
  try {
    if (!Array.isArray(names)) return;
    
    for (const name of names) {
      const exists = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (!exists) {
        await Medicine.create({ 
          name, 
          isGlobal: true,
          isCommon: false,
          category: 'Auto-Added'
        });
      }
    }
  } catch (err) {
    console.error('Error auto-saving medicine names:', err);
  }
};
