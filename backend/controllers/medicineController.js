import Medicine from '../models/Medicine.js';
import DiagnosisMaster from '../models/DiagnosisMaster.js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// GET /api/medicines/master
export const getMedicineMaster = async (req, res) => {
  try {
    const list = await Medicine.find({ 
      status: 'Active',
      $or: [{ organizationId: null }, { organizationId: req.tenantId }, { isGlobal: true }]
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

    // Build base tenant filter — show global medicines + org-specific medicines
    const tenantFilter = {
      status: 'Active',
      $or: [{ organizationId: null }, { organizationId: req.tenantId }, { isGlobal: true }]
    };

    let query;
    if (!q || q.trim() === '') {
      // No search term — return top common medicines
      query = Medicine.find(tenantFilter)
        .sort({ isCommon: -1, usageCount: -1, name: 1 })
        .limit(50);
    } else {
      const regex = new RegExp(q.trim(), 'i');
      query = Medicine.find({
        ...tenantFilter,
        $or: [
          { name: regex },
          { genericName: regex },
          { salt: regex },
          { category: regex },
          { keywords: regex }
        ]
      }).sort({
        isCommon: -1,
        usageCount: -1,
        name: 1
      }).limit(100);
    }

    const results = await query;
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

// Seed function with 300+ Core Medicines
export const seedMedicineMaster = async () => {
  try {
    const count = await Medicine.countDocuments({ isGlobal: true });
    const hasDental = await Medicine.findOne({ name: 'Ketorol-DT' });
    if (count > 280 && hasDental) return;

    const data = [
      // ─── ANALGESICS / ANTIPYRETICS ───────────────────────────────────────
      { name: 'Dolo 650', genericName: 'Paracetamol', salt: 'Paracetamol 650 MG', form: 'Tablet', strength: '650 MG', category: 'Analgesic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Calpol 500', genericName: 'Paracetamol', salt: 'Paracetamol 500 MG', form: 'Tablet', strength: '500 MG', category: 'Analgesic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Crocin Advance', genericName: 'Paracetamol', salt: 'Paracetamol 500 MG', form: 'Tablet', strength: '500 MG', category: 'Analgesic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Tylenol 500', genericName: 'Paracetamol', salt: 'Paracetamol 500 MG', form: 'Tablet', strength: '500 MG', category: 'Analgesic', isCommon: true },
      { name: 'Meftal Spas', genericName: 'Mefenamic Acid + Dicyclomine', salt: 'Mefenamic Acid 250 MG + Dicyclomine 10 MG', form: 'Tablet', category: 'Antispasmodic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Meftal-P', genericName: 'Mefenamic Acid + Paracetamol', salt: 'Mefenamic Acid 250 MG + Paracetamol 325 MG', form: 'Tablet', category: 'Analgesic', isCommon: true },
      { name: 'Combiflam', genericName: 'Ibuprofen + Paracetamol', salt: 'Ibuprofen 400 MG + Paracetamol 325 MG', form: 'Tablet', category: 'NSAID', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Brufen 400', genericName: 'Ibuprofen', salt: 'Ibuprofen 400 MG', form: 'Tablet', strength: '400 MG', category: 'NSAID', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Zerodol-SP', genericName: 'Aceclofenac + Paracetamol + Serratiopeptidase', salt: 'Aceclofenac 100 MG + Paracetamol 325 MG + Serratiopeptidase 15 MG', form: 'Tablet', category: 'NSAID', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Zerodol-P', genericName: 'Aceclofenac + Paracetamol', salt: 'Aceclofenac 100 MG + Paracetamol 325 MG', form: 'Tablet', category: 'NSAID', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Zerodol TH4', genericName: 'Aceclofenac + Thiocolchicoside', salt: 'Aceclofenac 100 MG + Thiocolchicoside 4 MG', form: 'Tablet', category: 'NSAID', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Voveran SR 100', genericName: 'Diclofenac', salt: 'Diclofenac 100 MG', form: 'Tablet', strength: '100 MG', category: 'NSAID', defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Diclofenac Gel', genericName: 'Diclofenac', salt: 'Diclofenac 1%', form: 'Gel', strength: '1%', category: 'NSAID', defaultWhen: 'External Use' },
      { name: 'Hifenac 100', genericName: 'Aceclofenac', salt: 'Aceclofenac 100 MG', form: 'Tablet', strength: '100 MG', category: 'NSAID', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Ultracet', genericName: 'Tramadol + Paracetamol', salt: 'Tramadol 37.5 MG + Paracetamol 325 MG', form: 'Tablet', category: 'Opioid Analgesic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Naprosyn 500', genericName: 'Naproxen', salt: 'Naproxen 500 MG', form: 'Tablet', strength: '500 MG', category: 'NSAID', defaultDose: '1-0-1', defaultWhen: 'After Food' },

      // ─── ANTIBIOTICS ───────────────────────────────────────────────────
      { name: 'Augmentin 625 Duo', genericName: 'Amoxycillin + Clavulanic Acid', salt: 'Amoxycillin 500 MG + Clavulanic Acid 125 MG', form: 'Tablet', strength: '625 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultFrequency: 'Daily', defaultDuration: '5 Days' },
      { name: 'Moxikind-CV 625', genericName: 'Amoxycillin + Clavulanic Acid', salt: 'Amoxycillin 500 MG + Clavulanic Acid 125 MG', form: 'Tablet', strength: '625 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Azithral 500', genericName: 'Azithromycin', salt: 'Azithromycin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Before Food', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Zithromax 500', genericName: 'Azithromycin', salt: 'Azithromycin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Before Food', defaultDuration: '3 Days' },
      { name: 'Taxim-O 200', genericName: 'Cefixime', salt: 'Cefixime 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultFrequency: 'Daily', defaultDuration: '5 Days' },
      { name: 'Zifi 200', genericName: 'Cefixime', salt: 'Cefixime 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', isCommon: true, defaultDose: '1-0-1', defaultDuration: '5 Days' },
      { name: 'Cepodem XP 200', genericName: 'Cefpodoxime', salt: 'Cefpodoxime 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Monocef 1G', genericName: 'Ceftriaxone', salt: 'Ceftriaxone 1000 MG', form: 'Injection', strength: '1G', category: 'Antibiotic', defaultWhen: 'IV/IM' },
      { name: 'Oflomac 200', genericName: 'Ofloxacin', salt: 'Ofloxacin 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Norflox 400', genericName: 'Norfloxacin', salt: 'Norfloxacin 400 MG', form: 'Tablet', strength: '400 MG', category: 'Antibiotic', keywords: ['UTI', 'Urinary Infection'], defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Norflox-TZ', genericName: 'Norfloxacin + Tinidazole', salt: 'Norfloxacin 400 MG + Tinidazole 600 MG', form: 'Tablet', category: 'Antibiotic', keywords: ['Diarrhea', 'Loose motion'], defaultDose: '1-0-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Metrogyl 400', genericName: 'Metronidazole', salt: 'Metronidazole 400 MG', form: 'Tablet', strength: '400 MG', category: 'Amoebicide', keywords: ['Loose motion', 'Diarrhea', 'Amoebiasis'], defaultDose: '1-1-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Flagyl 400', genericName: 'Metronidazole', salt: 'Metronidazole 400 MG', form: 'Tablet', strength: '400 MG', category: 'Amoebicide', keywords: ['Loose motion'], defaultDose: '1-1-1', defaultWhen: 'After Food' },
      { name: 'Ciprobid 500', genericName: 'Ciprofloxacin', salt: 'Ciprofloxacin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', keywords: ['UTI', 'Urinary Tract Infection'], defaultDose: '1-0-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Ciplox 500', genericName: 'Ciprofloxacin', salt: 'Ciprofloxacin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Doxycycline 100', genericName: 'Doxycycline', salt: 'Doxycycline 100 MG', form: 'Capsule', strength: '100 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food', defaultDuration: '7 Days' },
      { name: 'Vibramycin 100', genericName: 'Doxycycline', salt: 'Doxycycline 100 MG', form: 'Capsule', strength: '100 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Clavam 625', genericName: 'Amoxycillin + Clavulanic Acid', salt: 'Amoxycillin 500 MG + Clavulanic Acid 125 MG', form: 'Tablet', strength: '625 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Erythrocin 500', genericName: 'Erythromycin', salt: 'Erythromycin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Levoflox 500', genericName: 'Levofloxacin', salt: 'Levofloxacin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', keywords: ['Chest infection', 'Pneumonia'], defaultDose: '0-0-1', defaultWhen: 'After Food', defaultDuration: '5 Days' },
      { name: 'Levaquin 500', genericName: 'Levofloxacin', salt: 'Levofloxacin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antibiotic', defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Clindamycin 300', genericName: 'Clindamycin', salt: 'Clindamycin 300 MG', form: 'Capsule', strength: '300 MG', category: 'Antibiotic', defaultDose: '1-0-1', defaultWhen: 'After Food' },

      // ─── GASTRO / ANTACIDS / GI ──────────────────────────────────────
      { name: 'Pan 40', genericName: 'Pantoprazole', salt: 'Pantoprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'PPI', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food', defaultFrequency: 'Daily' },
      { name: 'Pantocid 40', genericName: 'Pantoprazole', salt: 'Pantoprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'PPI', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Omez 20', genericName: 'Omeprazole', salt: 'Omeprazole 20 MG', form: 'Capsule', strength: '20 MG', category: 'PPI', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Empty Stomach' },
      { name: 'Omeprazole 40', genericName: 'Omeprazole', salt: 'Omeprazole 40 MG', form: 'Capsule', strength: '40 MG', category: 'PPI', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Empty Stomach' },
      { name: 'Rantac 150', genericName: 'Ranitidine', salt: 'Ranitidine 150 MG', form: 'Tablet', strength: '150 MG', category: 'H2 Blocker', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Aciloc 150', genericName: 'Ranitidine', salt: 'Ranitidine 150 MG', form: 'Tablet', strength: '150 MG', category: 'H2 Blocker', defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Digene', genericName: 'Magnesium + Aluminium + Simethicone', salt: 'Mixed Salts', form: 'Syrup', category: 'Antacid', isCommon: true },
      { name: 'Gelusil', genericName: 'Magnesium + Aluminium Hydroxide', salt: 'Mixed', form: 'Tablet', category: 'Antacid', isCommon: true },
      { name: 'Mucaine Gel', genericName: 'Aluminium + Magnesium + Oxethazaine', salt: 'Mixed', form: 'Gel', category: 'Antacid', isCommon: true, defaultWhen: 'Before Food' },
      { name: 'Cremaffin', genericName: 'Liquid Paraffin + Milk of Magnesia', salt: 'Mixed', form: 'Syrup', category: 'Laxative', isCommon: true, defaultWhen: 'Night', keywords: ['Constipation'] },
      { name: 'Duphalac', genericName: 'Lactulose', salt: 'Lactulose 10 G/15 ML', form: 'Syrup', category: 'Laxative', keywords: ['Constipation'], defaultWhen: 'Night' },
      { name: 'Lupiset 4', genericName: 'Ondansetron', salt: 'Ondansetron 4 MG', form: 'Tablet', strength: '4 MG', category: 'Antiemetic', isCommon: true, keywords: ['Vomiting', 'Nausea'], defaultDose: '1-1-1', defaultWhen: 'Before Food' },
      { name: 'Perinorm', genericName: 'Metoclopramide', salt: 'Metoclopramide 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antiemetic', keywords: ['Vomiting', 'Nausea'], defaultDose: '1-1-1', defaultWhen: 'Before Food' },
      { name: 'Domperidone 10', genericName: 'Domperidone', salt: 'Domperidone 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antiemetic', isCommon: true, keywords: ['Nausea', 'Vomiting'], defaultDose: '1-1-1', defaultWhen: 'Before Food' },
      { name: 'Domstal', genericName: 'Domperidone', salt: 'Domperidone 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antiemetic', keywords: ['Nausea'], defaultDose: '1-1-1', defaultWhen: 'Before Food' },
      { name: 'Nexpro 40', genericName: 'Esomeprazole', salt: 'Esomeprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'PPI', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Nexium 40', genericName: 'Esomeprazole', salt: 'Esomeprazole 40 MG', form: 'Tablet', strength: '40 MG', category: 'PPI', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Rabeloc 20', genericName: 'Rabeprazole', salt: 'Rabeprazole 20 MG', form: 'Tablet', strength: '20 MG', category: 'PPI', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Razo 20', genericName: 'Rabeprazole', salt: 'Rabeprazole 20 MG', form: 'Tablet', strength: '20 MG', category: 'PPI', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Buscopan', genericName: 'Hyoscine Butylbromide', salt: 'Hyoscine 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antispasmodic', keywords: ['Abdominal pain', 'Spasm'], defaultDose: '1-1-1', defaultWhen: 'After Food' },
      { name: 'Drotaverine 40', genericName: 'Drotaverine', salt: 'Drotaverine 40 MG', form: 'Tablet', strength: '40 MG', category: 'Antispasmodic', keywords: ['Abdominal pain', 'Spasm'], defaultDose: '1-1-1' },
      { name: 'ORS Sachet', genericName: 'Oral Rehydration Salts', salt: 'ORS', form: 'Sachet', category: 'Electrolyte', keywords: ['Dehydration', 'Diarrhea', 'Vomiting'], isCommon: true },
      { name: 'Electral', genericName: 'Oral Rehydration Salts', salt: 'ORS Mix', form: 'Sachet', category: 'Electrolyte', isCommon: true, keywords: ['Dehydration'] },

      // ─── COUGH / COLD / ALLERGY / RESPIRATORY ───────────────────────
      { name: 'Allegra 120', genericName: 'Fexofenadine', salt: 'Fexofenadine 120 MG', form: 'Tablet', strength: '120 MG', category: 'Antihistamine', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Allegra 180', genericName: 'Fexofenadine', salt: 'Fexofenadine 180 MG', form: 'Tablet', strength: '180 MG', category: 'Antihistamine', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Cetirizine 10', genericName: 'Cetirizine', salt: 'Cetirizine 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antihistamine', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Zyrtec 10', genericName: 'Cetirizine', salt: 'Cetirizine 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antihistamine', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Levocet 5', genericName: 'Levocetirizine', salt: 'Levocetirizine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihistamine', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Xyzal 5', genericName: 'Levocetirizine', salt: 'Levocetirizine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihistamine', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Montair-LC', genericName: 'Montelukast + Levocetirizine', salt: 'Montelukast 10 MG + Levocetirizine 5 MG', form: 'Tablet', category: 'Antiallergic', isCommon: true, keywords: ['Allergy', 'Rhinitis'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Telekast-L', genericName: 'Montelukast + Levocetirizine', salt: 'Montelukast 10 MG + Levocetirizine 5 MG', form: 'Tablet', category: 'Antiallergic', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Montek LC', genericName: 'Montelukast + Levocetirizine', salt: 'Montelukast 10 MG + Levocetirizine 5 MG', form: 'Tablet', category: 'Antiallergic', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Ascoril LS', genericName: 'Ambroxol + Levosalbutamol + Guaiphenesin', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true, keywords: ['Cough', 'Bronchitis'] },
      { name: 'Alex Cough Syrup', genericName: 'Dextromethorphan + Chlorpheniramine + Guaifenesin', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true, keywords: ['Dry Cough'] },
      { name: 'Grilinctus', genericName: 'Dextromethorphan + Chlorpheniramine', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true, keywords: ['Dry Cough'] },
      { name: 'Benadryl Cough', genericName: 'Dextromethorphan + Diphenhydramine', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', isCommon: true, keywords: ['Cough', 'Cold'] },
      { name: 'Ambrodil-S', genericName: 'Ambroxol + Salbutamol', salt: 'Mixed', form: 'Syrup', category: 'Bronchodilator', keywords: ['Cough', 'Asthma'] },
      { name: 'Chericof', genericName: 'Dextromethorphan + Cetirizine + Guaifenesin', salt: 'Mixed', form: 'Syrup', category: 'Cough Syrup', keywords: ['Cough', 'Cold'] },
      { name: 'Nasivion Nasal Drops', genericName: 'Oxymetazoline', salt: 'Oxymetazoline 0.05%', form: 'Nasal Drops', strength: '0.05%', category: 'Decongestant', keywords: ['Blocked nose', 'Nasal congestion'] },
      { name: 'Otrivin Nasal Spray', genericName: 'Xylometazoline', salt: 'Xylometazoline 0.1%', form: 'Nasal Spray', strength: '0.1%', category: 'Decongestant', keywords: ['Blocked nose'] },
      { name: 'Asthalin Inhaler', genericName: 'Salbutamol', salt: 'Salbutamol 100 MCG/Puff', form: 'Inhaler', category: 'Bronchodilator', isCommon: true, keywords: ['Asthma', 'Wheezing', 'Breathlessness'] },
      { name: 'Deriphyllin', genericName: 'Theophylline + Etophylline', salt: 'Theophylline 100 MG + Etophylline 277 MG', form: 'Tablet', category: 'Bronchodilator', keywords: ['Asthma', 'COPD'] },
      { name: 'Foracort 200', genericName: 'Formoterol + Budesonide', salt: 'Formoterol 6 MCG + Budesonide 200 MCG', form: 'Inhaler', category: 'ICS+LABA', keywords: ['Asthma', 'COPD'] },
      { name: 'Seroflo 250', genericName: 'Salmeterol + Fluticasone', salt: 'Salmeterol 25 MCG + Fluticasone 250 MCG', form: 'Inhaler', category: 'ICS+LABA', keywords: ['Asthma', 'COPD'] },
      { name: 'Tiova', genericName: 'Tiotropium', salt: 'Tiotropium 18 MCG', form: 'Inhaler', category: 'Bronchodilator', keywords: ['COPD', 'Emphysema'] },
      { name: 'Budecort Respule', genericName: 'Budesonide', salt: 'Budesonide 0.5 MG', form: 'Respule', category: 'Corticosteroid', keywords: ['Asthma', 'Nebulization'] },
      { name: 'Phenylephrine Drops', genericName: 'Phenylephrine', salt: 'Phenylephrine 2.5%', form: 'Nasal Drops', strength: '2.5%', category: 'Decongestant', keywords: ['Nasal congestion', 'Blocked nose'] },

      // ─── DIABETES / ENDOCRINE ────────────────────────────────────────
      { name: 'Glycomet 500', genericName: 'Metformin', salt: 'Metformin 500 MG', form: 'Tablet', strength: '500 MG', category: 'Antidiabetic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food', keywords: ['Diabetes', 'Type 2 DM'] },
      { name: 'Glycomet 850', genericName: 'Metformin', salt: 'Metformin 850 MG', form: 'Tablet', strength: '850 MG', category: 'Antidiabetic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Glycomet SR 500', genericName: 'Metformin SR', salt: 'Metformin 500 MG SR', form: 'Tablet', strength: '500 MG', category: 'Antidiabetic', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Glycomet GP 1', genericName: 'Glimepiride + Metformin', salt: 'Glimepiride 1 MG + Metformin 500 MG', form: 'Tablet', category: 'Antidiabetic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Glycomet GP 2', genericName: 'Glimepiride + Metformin', salt: 'Glimepiride 2 MG + Metformin 500 MG', form: 'Tablet', category: 'Antidiabetic', defaultDose: '1-0-1', defaultWhen: 'Before Food' },
      { name: 'Amaryl 1', genericName: 'Glimepiride', salt: 'Glimepiride 1 MG', form: 'Tablet', strength: '1 MG', category: 'Antidiabetic', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Amaryl 2', genericName: 'Glimepiride', salt: 'Glimepiride 2 MG', form: 'Tablet', strength: '2 MG', category: 'Antidiabetic', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Januvia 100', genericName: 'Sitagliptin', salt: 'Sitagliptin 100 MG', form: 'Tablet', strength: '100 MG', category: 'Antidiabetic', keywords: ['Diabetes', 'DM2'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Galvus 50', genericName: 'Vildagliptin', salt: 'Vildagliptin 50 MG', form: 'Tablet', strength: '50 MG', category: 'Antidiabetic', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Jardiance 10', genericName: 'Empagliflozin', salt: 'Empagliflozin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidiabetic', keywords: ['Diabetes', 'Heart failure'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Dapagliflozin 10', genericName: 'Dapagliflozin', salt: 'Dapagliflozin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidiabetic', keywords: ['Diabetes', 'Heart failure'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Human Actrapid', genericName: 'Regular Insulin', salt: 'Insulin Human 100 IU/ML', form: 'Injection', category: 'Insulin', keywords: ['Diabetes', 'Insulin'] },
      { name: 'Lantus', genericName: 'Insulin Glargine', salt: 'Insulin Glargine 100 IU/ML', form: 'Injection', category: 'Insulin', keywords: ['Diabetes', 'Basal Insulin'] },
      { name: 'Thyronorm 50', genericName: 'Levothyroxine', salt: 'Levothyroxine 50 MCG', form: 'Tablet', strength: '50 MCG', category: 'Thyroid', keywords: ['Hypothyroidism'], defaultDose: '1-0-0', defaultWhen: 'Empty Stomach' },
      { name: 'Eltroxin 50', genericName: 'Levothyroxine', salt: 'Levothyroxine 50 MCG', form: 'Tablet', strength: '50 MCG', category: 'Thyroid', keywords: ['Hypothyroidism'], defaultDose: '1-0-0', defaultWhen: 'Empty Stomach' },
      { name: 'Neomercazole', genericName: 'Carbimazole', salt: 'Carbimazole 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antithyroid', keywords: ['Hyperthyroidism'] },

      // ─── HYPERTENSION / CARDIAC ──────────────────────────────────────
      { name: 'Telma 40', genericName: 'Telmisartan', salt: 'Telmisartan 40 MG', form: 'Tablet', strength: '40 MG', category: 'Antihypertensive', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food', keywords: ['Hypertension', 'BP'] },
      { name: 'Telma 80', genericName: 'Telmisartan', salt: 'Telmisartan 80 MG', form: 'Tablet', strength: '80 MG', category: 'Antihypertensive', defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Telma-H', genericName: 'Telmisartan + Hydrochlorothiazide', salt: 'Telmisartan 40 MG + HCTZ 12.5 MG', form: 'Tablet', category: 'Antihypertensive', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Before Food' },
      { name: 'Amlokind-5', genericName: 'Amlodipine', salt: 'Amlodipine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihypertensive', isCommon: true, defaultDose: '1-0-0', keywords: ['BP', 'Hypertension'] },
      { name: 'Norvasc 5', genericName: 'Amlodipine', salt: 'Amlodipine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihypertensive', defaultDose: '1-0-0' },
      { name: 'Stamlo 5', genericName: 'Amlodipine', salt: 'Amlodipine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antihypertensive', isCommon: true, defaultDose: '1-0-0' },
      { name: 'Atenolol 50', genericName: 'Atenolol', salt: 'Atenolol 50 MG', form: 'Tablet', strength: '50 MG', category: 'Beta Blocker', keywords: ['BP', 'Heart Rate'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Tenormin 50', genericName: 'Atenolol', salt: 'Atenolol 50 MG', form: 'Tablet', strength: '50 MG', category: 'Beta Blocker', defaultDose: '1-0-0' },
      { name: 'Metoprolol 25', genericName: 'Metoprolol', salt: 'Metoprolol 25 MG', form: 'Tablet', strength: '25 MG', category: 'Beta Blocker', keywords: ['Hypertension', 'Heart failure'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Revelol 25', genericName: 'Metoprolol', salt: 'Metoprolol 25 MG', form: 'Tablet', strength: '25 MG', category: 'Beta Blocker', defaultDose: '1-0-1' },
      { name: 'Losartan 50', genericName: 'Losartan', salt: 'Losartan 50 MG', form: 'Tablet', strength: '50 MG', category: 'Antihypertensive', keywords: ['Hypertension', 'BP'], defaultDose: '1-0-0' },
      { name: 'Atorva 10', genericName: 'Atorvastatin', salt: 'Atorvastatin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Statin', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night', keywords: ['Cholesterol', 'Hyperlipidemia'] },
      { name: 'Atorva 20', genericName: 'Atorvastatin', salt: 'Atorvastatin 20 MG', form: 'Tablet', strength: '20 MG', category: 'Statin', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Atorva 40', genericName: 'Atorvastatin', salt: 'Atorvastatin 40 MG', form: 'Tablet', strength: '40 MG', category: 'Statin', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Rozucor 10', genericName: 'Rosuvastatin', salt: 'Rosuvastatin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Statin', isCommon: true, defaultDose: '0-0-1', defaultWhen: 'Night', keywords: ['Cholesterol'] },
      { name: 'Crestor 10', genericName: 'Rosuvastatin', salt: 'Rosuvastatin 10 MG', form: 'Tablet', strength: '10 MG', category: 'Statin', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Ecosprin 75', genericName: 'Aspirin', salt: 'Aspirin 75 MG', form: 'Tablet', strength: '75 MG', category: 'Antiplatelet', isCommon: true, defaultDose: '0-1-0', defaultWhen: 'After Food', keywords: ['Heart disease', 'Antiplatelet'] },
      { name: 'Ecosprin 150', genericName: 'Aspirin', salt: 'Aspirin 150 MG', form: 'Tablet', strength: '150 MG', category: 'Antiplatelet', defaultDose: '0-1-0', defaultWhen: 'After Food' },
      { name: 'Clopilet 75', genericName: 'Clopidogrel', salt: 'Clopidogrel 75 MG', form: 'Tablet', strength: '75 MG', category: 'Antiplatelet', keywords: ['Heart disease', 'Stent'], defaultDose: '0-1-0', defaultWhen: 'After Food' },
      { name: 'Plavix 75', genericName: 'Clopidogrel', salt: 'Clopidogrel 75 MG', form: 'Tablet', strength: '75 MG', category: 'Antiplatelet', defaultDose: '0-1-0', defaultWhen: 'After Food' },
      { name: 'Strocit 500', genericName: 'Citicoline', salt: 'Citicoline 500 MG', form: 'Tablet', strength: '500 MG', category: 'Neuroprotective', keywords: ['Stroke', 'Brain'] },
      { name: 'Trimetazidine 35', genericName: 'Trimetazidine', salt: 'Trimetazidine 35 MG', form: 'Tablet', strength: '35 MG', category: 'Cardiac', keywords: ['Angina', 'Heart disease'] },

      // ─── VITAMINS / SUPPLEMENTS ──────────────────────────────────────
      { name: 'Shelcal 500', genericName: 'Calcium + Vitamin D3', salt: 'Calcium 500 MG + Vitamin D3 250 IU', form: 'Tablet', category: 'Supplement', isCommon: true, defaultDose: '0-1-0', defaultWhen: 'After Food', keywords: ['Calcium', 'Bone'] },
      { name: 'Calcitas 500', genericName: 'Calcium Carbonate + Vitamin D3', salt: 'Calcium 500 MG + Vitamin D3 250 IU', form: 'Tablet', category: 'Supplement', isCommon: true, defaultDose: '0-1-0', defaultWhen: 'After Food' },
      { name: 'Calcirol 60K', genericName: 'Cholecalciferol', salt: 'Vitamin D3 60000 IU', form: 'Sachet', strength: '60000 IU', category: 'Vitamin D', isCommon: true, keywords: ['Vitamin D deficiency'], defaultDose: '1-0-0', defaultWhen: 'After Food', defaultFrequency: 'Weekly' },
      { name: 'D-Rise 60K', genericName: 'Cholecalciferol', salt: 'Vitamin D3 60000 IU', form: 'Sachet', strength: '60000 IU', category: 'Vitamin D', isCommon: true, keywords: ['Vitamin D'], defaultDose: '1-0-0', defaultFrequency: 'Weekly' },
      { name: 'Becosules', genericName: 'B-Complex + Vitamin C', salt: 'Multivitamin', form: 'Capsule', category: 'Vitamin', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'After Food', keywords: ['Vitamin B', 'Vitamin C'] },
      { name: 'Beplex Forte', genericName: 'B-Complex + Vitamin C', salt: 'Multivitamin', form: 'Tablet', category: 'Vitamin', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Supradyn', genericName: 'Multivitamin + Multimineral', salt: 'Mixed', form: 'Tablet', category: 'Supplement', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Nutrolin-B', genericName: 'B-Complex + Zinc', salt: 'Mixed', form: 'Syrup', category: 'Vitamin', defaultDose: '5 ML twice daily' },
      { name: 'Folvite 5', genericName: 'Folic Acid', salt: 'Folic Acid 5 MG', form: 'Tablet', strength: '5 MG', category: 'Vitamin', keywords: ['Anemia', 'Pregnancy', 'Folate'], defaultDose: '1-0-0' },
      { name: 'Macfolate', genericName: 'Folic Acid', salt: 'Folic Acid 5 MG', form: 'Tablet', strength: '5 MG', category: 'Vitamin', keywords: ['Anemia', 'Pregnancy'], defaultDose: '1-0-0' },
      { name: 'Mecobal 500', genericName: 'Methylcobalamin', salt: 'Methylcobalamin 500 MCG', form: 'Tablet', strength: '500 MCG', category: 'Vitamin B12', isCommon: true, keywords: ['Neuropathy', 'Vitamin B12', 'Nerve pain'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Neurobion Forte', genericName: 'Vitamin B1 + B6 + B12', salt: 'Mixed B-vitamins', form: 'Tablet', category: 'Vitamin B', isCommon: true, keywords: ['Neuropathy', 'Nerve', 'B12'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Feronia XT', genericName: 'Iron + Folic Acid', salt: 'Ferrous Ascorbate 100 MG + Folic Acid 1.5 MG', form: 'Tablet', category: 'Iron', isCommon: true, keywords: ['Anemia', 'Iron deficiency', 'Pregnancy'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Orofer XT', genericName: 'Iron + Folic Acid', salt: 'Ferric Hydroxide Polymaltose 100 MG + Folic Acid 5 MG', form: 'Tablet', category: 'Iron', isCommon: true, keywords: ['Anemia', 'Iron'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Livogen Z', genericName: 'Iron + Folic Acid + Zinc', salt: 'Ferrous Fumarate 150 MG + Folic Acid 0.5 MG + Zinc 61.8 MG', form: 'Tablet', category: 'Iron', keywords: ['Anemia', 'Pregnancy'], defaultDose: '1-0-0' },
      { name: 'Zinco-15', genericName: 'Zinc', salt: 'Zinc Sulphate 15 MG', form: 'Tablet', strength: '15 MG', category: 'Supplement', keywords: ['Zinc deficiency', 'Immunity'], defaultDose: '1-0-0' },
      { name: 'Vitamin C 500', genericName: 'Ascorbic Acid', salt: 'Vitamin C 500 MG', form: 'Tablet', strength: '500 MG', category: 'Vitamin C', isCommon: true, keywords: ['Immunity', 'Scurvy'], defaultDose: '1-0-0' },
      { name: 'Limcee 500', genericName: 'Vitamin C', salt: 'Ascorbic Acid 500 MG', form: 'Chewable Tablet', strength: '500 MG', category: 'Vitamin C', isCommon: true, defaultDose: '1-0-0' },
      { name: 'Zincovit', genericName: 'Zinc + Multivitamin', salt: 'Mixed', form: 'Tablet', category: 'Supplement', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Omega-3 Capsule', genericName: 'Omega-3 Fatty Acids', salt: 'EPA + DHA', form: 'Capsule', category: 'Supplement', keywords: ['Cholesterol', 'Heart'], defaultDose: '0-0-1', defaultWhen: 'After Food' },

      // ─── STEROIDS / ANTI-INFLAMMATORY ──────────────────────────────
      { name: 'Wysolone 10', genericName: 'Prednisolone', salt: 'Prednisolone 10 MG', form: 'Tablet', strength: '10 MG', category: 'Corticosteroid', isCommon: true, keywords: ['Allergy', 'Asthma', 'Inflammation'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Wysolone 20', genericName: 'Prednisolone', salt: 'Prednisolone 20 MG', form: 'Tablet', strength: '20 MG', category: 'Corticosteroid', defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Wysolone 5', genericName: 'Prednisolone', salt: 'Prednisolone 5 MG', form: 'Tablet', strength: '5 MG', category: 'Corticosteroid', defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Omnacortil 5', genericName: 'Prednisolone', salt: 'Prednisolone 5 MG', form: 'Tablet', strength: '5 MG', category: 'Corticosteroid', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Dexamethasone 0.5', genericName: 'Dexamethasone', salt: 'Dexamethasone 0.5 MG', form: 'Tablet', strength: '0.5 MG', category: 'Corticosteroid', keywords: ['Allergy', 'Inflammation'] },
      { name: 'Betnesol 0.5', genericName: 'Betamethasone', salt: 'Betamethasone 0.5 MG', form: 'Tablet', strength: '0.5 MG', category: 'Corticosteroid', keywords: ['Allergy', 'Inflammation'] },
      { name: 'Methyl Prednisolone 16', genericName: 'Methylprednisolone', salt: 'Methylprednisolone 16 MG', form: 'Tablet', strength: '16 MG', category: 'Corticosteroid', keywords: ['Allergy', 'Lupus', 'Rheumatoid'] },
      { name: 'Medrol 16', genericName: 'Methylprednisolone', salt: 'Methylprednisolone 16 MG', form: 'Tablet', strength: '16 MG', category: 'Corticosteroid', defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Depo Medrol', genericName: 'Methylprednisolone Acetate', salt: 'Methylprednisolone 40 MG/ML', form: 'Injection', category: 'Corticosteroid', keywords: ['Joint pain', 'Injection'] },
      { name: 'Kenacort 10', genericName: 'Triamcinolone', salt: 'Triamcinolone 10 MG/ML', form: 'Injection', category: 'Corticosteroid', keywords: ['Joint', 'Skin'] },

      // ─── PAIN / MUSCULOSKELETAL ───────────────────────────────────────
      { name: 'Thiocolchicoside 8', genericName: 'Thiocolchicoside', salt: 'Thiocolchicoside 8 MG', form: 'Tablet', strength: '8 MG', category: 'Muscle Relaxant', isCommon: true, keywords: ['Back pain', 'Spasm', 'Muscle relaxant'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Mydocalm 150', genericName: 'Tolperisone', salt: 'Tolperisone 150 MG', form: 'Tablet', strength: '150 MG', category: 'Muscle Relaxant', keywords: ['Back pain', 'Spasm'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Ultramid 75', genericName: 'Pregabalin', salt: 'Pregabalin 75 MG', form: 'Capsule', strength: '75 MG', category: 'Neuropathic', isCommon: true, keywords: ['Neuropathy', 'Nerve pain', 'Diabetic neuropathy'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Pregabalin 75', genericName: 'Pregabalin', salt: 'Pregabalin 75 MG', form: 'Capsule', strength: '75 MG', category: 'Neuropathic', isCommon: true, keywords: ['Neuropathy', 'Fibromyalgia'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Lyrica 75', genericName: 'Pregabalin', salt: 'Pregabalin 75 MG', form: 'Capsule', strength: '75 MG', category: 'Neuropathic', defaultDose: '1-0-1', defaultWhen: 'Night' },
      { name: 'Gabapentin 300', genericName: 'Gabapentin', salt: 'Gabapentin 300 MG', form: 'Capsule', strength: '300 MG', category: 'Neuropathic', keywords: ['Neuropathy', 'Seizure'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Gabapin 300', genericName: 'Gabapentin', salt: 'Gabapentin 300 MG', form: 'Capsule', strength: '300 MG', category: 'Neuropathic', isCommon: true, defaultDose: '1-0-1', defaultWhen: 'Night' },
      { name: 'Hydroxychloroquine 200', genericName: 'Hydroxychloroquine', salt: 'Hydroxychloroquine 200 MG', form: 'Tablet', strength: '200 MG', category: 'DMARD', keywords: ['Rheumatoid', 'Lupus', 'Malaria'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Hcqs 200', genericName: 'Hydroxychloroquine', salt: 'Hydroxychloroquine 200 MG', form: 'Tablet', strength: '200 MG', category: 'DMARD', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Methotrexate 7.5', genericName: 'Methotrexate', salt: 'Methotrexate 7.5 MG', form: 'Tablet', strength: '7.5 MG', category: 'DMARD', keywords: ['Rheumatoid', 'Psoriasis'], defaultFrequency: 'Weekly' },
      { name: 'Momate Cream', genericName: 'Mometasone', salt: 'Mometasone 0.1%', form: 'Cream', strength: '0.1%', category: 'Topical Steroid', keywords: ['Eczema', 'Psoriasis', 'Skin rash'], defaultWhen: 'External Use' },
      { name: 'Betnovate Cream', genericName: 'Betamethasone', salt: 'Betamethasone 0.1%', form: 'Cream', strength: '0.1%', category: 'Topical Steroid', keywords: ['Eczema', 'Skin rash'], defaultWhen: 'External Use' },
      { name: 'Clobetasol Cream', genericName: 'Clobetasol', salt: 'Clobetasol 0.05%', form: 'Cream', strength: '0.05%', category: 'Topical Steroid', keywords: ['Psoriasis', 'Dermatitis'], defaultWhen: 'External Use' },

      // ─── PSYCHIATRY / NEUROLOGY ──────────────────────────────────────
      { name: 'Clonazepam 0.5', genericName: 'Clonazepam', salt: 'Clonazepam 0.5 MG', form: 'Tablet', strength: '0.5 MG', category: 'Anxiolytic', isCommon: true, keywords: ['Anxiety', 'Seizure'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Rivotril 0.5', genericName: 'Clonazepam', salt: 'Clonazepam 0.5 MG', form: 'Tablet', strength: '0.5 MG', category: 'Anxiolytic', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Escitalopram 10', genericName: 'Escitalopram', salt: 'Escitalopram 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidepressant', isCommon: true, keywords: ['Depression', 'Anxiety', 'OCD'], defaultDose: '1-0-0', defaultWhen: 'Morning' },
      { name: 'Nexito 10', genericName: 'Escitalopram', salt: 'Escitalopram 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidepressant', isCommon: true, defaultDose: '1-0-0', defaultWhen: 'Morning' },
      { name: 'Sertraline 50', genericName: 'Sertraline', salt: 'Sertraline 50 MG', form: 'Tablet', strength: '50 MG', category: 'Antidepressant', keywords: ['Depression', 'Anxiety', 'PTSD'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Daxid 50', genericName: 'Sertraline', salt: 'Sertraline 50 MG', form: 'Tablet', strength: '50 MG', category: 'Antidepressant', defaultDose: '1-0-0' },
      { name: 'Amitriptyline 10', genericName: 'Amitriptyline', salt: 'Amitriptyline 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidepressant', keywords: ['Depression', 'Neuropathy', 'Headache'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Tryptomer 10', genericName: 'Amitriptyline', salt: 'Amitriptyline 10 MG', form: 'Tablet', strength: '10 MG', category: 'Antidepressant', isCommon: true, keywords: ['Neuropathy', 'Headache', 'Depression'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Olanzapine 5', genericName: 'Olanzapine', salt: 'Olanzapine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antipsychotic', keywords: ['Schizophrenia', 'Bipolar'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Olanex 5', genericName: 'Olanzapine', salt: 'Olanzapine 5 MG', form: 'Tablet', strength: '5 MG', category: 'Antipsychotic', defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Phenobarbitone 60', genericName: 'Phenobarbitone', salt: 'Phenobarbitone 60 MG', form: 'Tablet', strength: '60 MG', category: 'Antiepileptic', keywords: ['Seizure', 'Epilepsy'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Eptoin 100', genericName: 'Phenytoin', salt: 'Phenytoin 100 MG', form: 'Tablet', strength: '100 MG', category: 'Antiepileptic', keywords: ['Epilepsy', 'Seizure'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Valparin 200', genericName: 'Valproate', salt: 'Sodium Valproate 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antiepileptic', keywords: ['Epilepsy', 'Seizure', 'Bipolar'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Zolpidem 5', genericName: 'Zolpidem', salt: 'Zolpidem 5 MG', form: 'Tablet', strength: '5 MG', category: 'Sedative', keywords: ['Insomnia', 'Sleep disorder'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Nitrest 5', genericName: 'Zolpidem', salt: 'Zolpidem 5 MG', form: 'Tablet', strength: '5 MG', category: 'Sedative', keywords: ['Insomnia'], defaultDose: '0-0-1', defaultWhen: 'Night' },

      // ─── DERMATOLOGY ─────────────────────────────────────────────────
      { name: 'Ketoconazole 200', genericName: 'Ketoconazole', salt: 'Ketoconazole 200 MG', form: 'Tablet', strength: '200 MG', category: 'Antifungal', keywords: ['Fungal infection', 'Candida'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Fluconazole 150', genericName: 'Fluconazole', salt: 'Fluconazole 150 MG', form: 'Tablet', strength: '150 MG', category: 'Antifungal', isCommon: true, keywords: ['Fungal', 'Candida', 'Vaginal thrush'], defaultDose: '1-0-0', defaultFrequency: 'Single dose' },
      { name: 'Canesten Cream', genericName: 'Clotrimazole', salt: 'Clotrimazole 1%', form: 'Cream', strength: '1%', category: 'Antifungal', keywords: ['Fungal infection', 'Tinea'], defaultWhen: 'External Use' },
      { name: 'Terbinafine 250', genericName: 'Terbinafine', salt: 'Terbinafine 250 MG', form: 'Tablet', strength: '250 MG', category: 'Antifungal', keywords: ['Fungal', 'Tinea', 'Onychomycosis'], defaultDose: '1-0-0', defaultWhen: 'After Food', defaultDuration: '6 Weeks' },
      { name: 'Lamisil 250', genericName: 'Terbinafine', salt: 'Terbinafine 250 MG', form: 'Tablet', strength: '250 MG', category: 'Antifungal', defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Clotrimazole Cream', genericName: 'Clotrimazole', salt: 'Clotrimazole 1%', form: 'Cream', strength: '1%', category: 'Antifungal', keywords: ['Tinea', 'Ringworm', 'Fungal'], defaultWhen: 'External Use' },
      { name: 'Hydroxyzine 25', genericName: 'Hydroxyzine', salt: 'Hydroxyzine 25 MG', form: 'Tablet', strength: '25 MG', category: 'Antihistamine', keywords: ['Itch', 'Urticaria', 'Hives', 'Allergy'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Atarax 25', genericName: 'Hydroxyzine', salt: 'Hydroxyzine 25 MG', form: 'Tablet', strength: '25 MG', category: 'Antihistamine', isCommon: true, keywords: ['Itch', 'Urticaria', 'Anxiety'], defaultDose: '0-0-1', defaultWhen: 'Night' },
      { name: 'Isotretinoin 10', genericName: 'Isotretinoin', salt: 'Isotretinoin 10 MG', form: 'Capsule', strength: '10 MG', category: 'Dermatology', keywords: ['Acne', 'Severe acne'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Acutret 10', genericName: 'Isotretinoin', salt: 'Isotretinoin 10 MG', form: 'Capsule', strength: '10 MG', category: 'Dermatology', keywords: ['Acne'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Adapalene 0.1% Gel', genericName: 'Adapalene', salt: 'Adapalene 0.1%', form: 'Gel', strength: '0.1%', category: 'Dermatology', keywords: ['Acne', 'Pimple'], defaultWhen: 'External Use, Night only' },
      { name: 'Clindac A Gel', genericName: 'Clindamycin + Adapalene', salt: 'Clindamycin 1% + Adapalene 0.1%', form: 'Gel', category: 'Dermatology', keywords: ['Acne', 'Pimple'], defaultWhen: 'External Use, Night only' },
      { name: 'Mupirocin Ointment', genericName: 'Mupirocin', salt: 'Mupirocin 2%', form: 'Ointment', strength: '2%', category: 'Antibiotic Topical', keywords: ['Skin infection', 'Impetigo'], defaultWhen: 'External Use, 3 times daily' },
      { name: 'Soframycin Cream', genericName: 'Framycetin', salt: 'Framycetin 1%', form: 'Cream', strength: '1%', category: 'Antibiotic Topical', keywords: ['Wound', 'Burn', 'Skin infection'], defaultWhen: 'External Use' },
      { name: 'Silver Sulfadiazine Cream', genericName: 'Silver Sulfadiazine', salt: 'Silver Sulfadiazine 1%', form: 'Cream', strength: '1%', category: 'Antibiotic Topical', keywords: ['Burn', 'Wound'], defaultWhen: 'External Use' },

      // ─── UROLOGY / GYNAECOLOGY ───────────────────────────────────────
      { name: 'Tamsulosin 0.4', genericName: 'Tamsulosin', salt: 'Tamsulosin 0.4 MG', form: 'Capsule', strength: '0.4 MG', category: 'Alpha Blocker', keywords: ['BPH', 'Prostate', 'Urinary retention'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Urimax 0.4', genericName: 'Tamsulosin', salt: 'Tamsulosin 0.4 MG', form: 'Capsule', strength: '0.4 MG', category: 'Alpha Blocker', isCommon: true, keywords: ['BPH', 'Prostate'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Finasteride 5', genericName: 'Finasteride', salt: 'Finasteride 5 MG', form: 'Tablet', strength: '5 MG', category: '5-Alpha Reductase Inhibitor', keywords: ['BPH', 'Prostate', 'Hair loss'], defaultDose: '0-0-1', defaultWhen: 'After Food' },
      { name: 'Duphaston 10', genericName: 'Dydrogesterone', salt: 'Dydrogesterone 10 MG', form: 'Tablet', strength: '10 MG', category: 'Progestogen', keywords: ['Pregnancy', 'Threatened abortion', 'Irregular periods'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Progynova 2', genericName: 'Estradiol', salt: 'Estradiol Valerate 2 MG', form: 'Tablet', strength: '2 MG', category: 'Estrogen', keywords: ['Menopause', 'HRT'], defaultDose: '1-0-0', defaultWhen: 'After Food' },
      { name: 'Norethisterone 5', genericName: 'Norethisterone', salt: 'Norethisterone 5 MG', form: 'Tablet', strength: '5 MG', category: 'Progestogen', keywords: ['Periods delay', 'Menorrhagia'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Primolut-N 5', genericName: 'Norethisterone', salt: 'Norethisterone 5 MG', form: 'Tablet', strength: '5 MG', category: 'Progestogen', isCommon: true, keywords: ['Period delay', 'Abnormal bleeding'], defaultDose: '1-0-1', defaultWhen: 'After Food' },
      { name: 'Pyridium', genericName: 'Phenazopyridine', salt: 'Phenazopyridine 200 MG', form: 'Tablet', strength: '200 MG', category: 'Urinary Analgesic', keywords: ['UTI', 'Burning urination'], defaultDose: '1-1-1', defaultWhen: 'After Food', defaultDuration: '2 Days' },
      { name: 'I-Pill', genericName: 'Levonorgestrel', salt: 'Levonorgestrel 1.5 MG', form: 'Tablet', strength: '1.5 MG', category: 'Emergency Contraceptive', keywords: ['Emergency contraception'], defaultDose: 'Single Dose', defaultDuration: 'Single Dose' },

      // ─── OPHTHALMOLOGY ────────────────────────────────────────────────
      { name: 'Tobramycin Eye Drops', genericName: 'Tobramycin', salt: 'Tobramycin 0.3%', form: 'Eye Drops', strength: '0.3%', category: 'Antibiotic Eye', keywords: ['Eye infection', 'Conjunctivitis'], defaultWhen: '1 drop 4 times daily' },
      { name: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin', salt: 'Moxifloxacin 0.5%', form: 'Eye Drops', strength: '0.5%', category: 'Antibiotic Eye', isCommon: true, keywords: ['Eye infection', 'Conjunctivitis'], defaultWhen: '1 drop 3 times daily' },
      { name: 'Vigamox Eye Drops', genericName: 'Moxifloxacin', salt: 'Moxifloxacin 0.5%', form: 'Eye Drops', strength: '0.5%', category: 'Antibiotic Eye', keywords: ['Eye infection'], defaultWhen: '1 drop 3 times daily' },
      { name: 'Pred Forte Eye Drops', genericName: 'Prednisolone Acetate', salt: 'Prednisolone 1%', form: 'Eye Drops', strength: '1%', category: 'Steroid Eye', keywords: ['Eye inflammation', 'Uveitis'], defaultWhen: '1 drop 4 times daily' },
      { name: 'Artificial Tears', genericName: 'Carboxymethylcellulose', salt: 'CMC 0.5%', form: 'Eye Drops', category: 'Lubricant Eye', keywords: ['Dry eyes', 'Eye dryness'], defaultWhen: 'As needed' },
      { name: 'Timolol Eye Drops', genericName: 'Timolol', salt: 'Timolol 0.5%', form: 'Eye Drops', strength: '0.5%', category: 'Glaucoma', keywords: ['Glaucoma', 'High eye pressure'], defaultWhen: '1 drop twice daily' },

      // ─── DENTAL / DENTISTRY ───────────────────────────────────────────
      { name: 'Ketorol-DT', genericName: 'Ketorolac Tromethamine', salt: 'Ketorolac Tromethamine 10 MG', form: 'Tablet', strength: '10 MG', category: 'Dental Analgesic', isCommon: true, keywords: ['tooth pain', 'severe tooth pain', 'dental pain'], defaultDose: '1-0-1', defaultWhen: 'After Food (Dissolve in water)', defaultFrequency: 'Daily', defaultDuration: '3 Days' },
      { name: 'Sensodyne Rapid Relief', genericName: 'Toothpaste for Sensitive Teeth', salt: 'Strontium Acetate + Fluoride', form: 'Gel', strength: '80 GM', category: 'Dental Care', isCommon: true, keywords: ['sensitivity', 'tooth sensitivity', 'sensodyne'], defaultDose: 'Apply twice daily', defaultWhen: 'External Use', defaultFrequency: 'Twice Daily (BD)', defaultDuration: 'Ongoing' },
      { name: 'Hexidine Mouthwash', genericName: 'Chlorhexidine Gluconate Mouthwash', salt: 'Chlorhexidine Gluconate 0.2%', form: 'Liquid', strength: '150 ML', category: 'Dental Antiseptic', isCommon: true, keywords: ['mouthwash', 'gum infection', 'bad breath'], defaultDose: '10 ml rinse for 1 min', defaultWhen: 'After Food', defaultFrequency: 'Twice Daily (BD)', defaultDuration: '5 Days' },
      { name: 'Ora-fast Gel', genericName: 'Choline Salicylate + Lignocaine Oral Gel', salt: 'Choline Salicylate 8.7% + Lignocaine HCl 2%', form: 'Gel', strength: '15 GM', category: 'Dental Analgesic Gel', isCommon: true, keywords: ['mouth ulcer', 'ulcer gel', 'chale'], defaultDose: 'Apply locally on ulcer', defaultWhen: 'Before Food', defaultFrequency: 'Thrice Daily (TDS)', defaultDuration: '5 Days' },
      { name: 'Metrogyl DG Gel', genericName: 'Metronidazole + Chlorhexidine Oral Gel', salt: 'Metronidazole 1% + Chlorhexidine Gluconate 0.25%', form: 'Gel', strength: '20 GM', category: 'Dental Antibacterial Gel', isCommon: true, keywords: ['gum swelling', 'gum pain', 'swollen gums'], defaultDose: 'Apply locally on gums', defaultWhen: 'After Food', defaultFrequency: 'Twice Daily (BD)', defaultDuration: '7 Days' },
      { name: 'Zytee L Gel', genericName: 'Choline Salicylate + Lidocaine Gel', salt: 'Choline Salicylate 9% + Lidocaine 2%', form: 'Gel', strength: '10 GM', category: 'Dental Analgesic Gel', isCommon: true, keywords: ['mouth ulcer', 'ulcer gel', 'pain gel'], defaultDose: 'Apply on affected areas', defaultWhen: 'Before Food', defaultFrequency: 'Thrice Daily (TDS)', defaultDuration: '5 Days' },
      { name: 'Senquel-AD', genericName: 'Mouthwash for Sensitive Teeth', salt: 'Potassium Nitrate + Sodium Monofluorophosphate', form: 'Liquid', strength: '100 ML', category: 'Dental Care', isCommon: true, keywords: ['sensitivity', 'sensitive teeth', 'senquel'], defaultDose: '10 ml rinse', defaultWhen: 'Before Brush', defaultFrequency: 'Twice Daily (BD)', defaultDuration: '1 Month' },
      { name: 'Dentogel', genericName: 'Choline Salicylate + Lidocaine Oral Gel', salt: 'Choline Salicylate 8.7% + Lidocaine HCl 2%', form: 'Gel', strength: '15 GM', category: 'Dental Analgesic Gel', isCommon: true, keywords: ['ulcer gel', 'gum pain', 'ulcer'], defaultDose: 'Apply locally on pain area', defaultWhen: 'Before Food', defaultFrequency: 'Thrice Daily (TDS)', defaultDuration: '5 Days' }
    ];

    const bulkOps = data.map(med => ({
      updateOne: {
        filter: { name: med.name },
        update: { $setOnInsert: { ...med, isGlobal: true, isActive: true } },
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

// POST /api/medicines/recommendations
export const getMedicineRecommendations = async (req, res) => {
  try {
    const { diagnosis, complaints, specialty, age, gender } = req.body;
    
    // 1. Check if diagnosis exists in Database and has recommended medicines
    if (diagnosis) {
      const dbDiagnosis = await DiagnosisMaster.findOne({ 
        name: { $regex: new RegExp(`^${diagnosis}$`, 'i') } 
      });
      
      if (dbDiagnosis && dbDiagnosis.recommendedMedicines && dbDiagnosis.recommendedMedicines.length > 0) {
        return res.json({
          suggestions: dbDiagnosis.recommendedMedicines,
          reason: 'Standard treatment protocol from database',
          source: 'Database'
        });
      }
    }

    // 2. Fallback to AI Generation
    const prompt = `Act as an expert clinical pharmacologist. Recommend 5-10 appropriate medicines for this case.
    Diagnosis: ${diagnosis || ''}
    Complaints: ${JSON.stringify(complaints || [])}
    Specialty: ${specialty || ''}
    Patient: ${age || ''}y ${gender || ''}
    
    CRITICAL: Return ONLY valid JSON.
    Format: { "suggestions": [ { "name": "Medicine", "generic": "Salt", "form": "Tablet", "strength": "500mg", "dose": "1-0-1", "when": "After Food", "freq": "Daily", "dur": "5 Days" }, ... ], "reason": "..." }`;
    
    // Using groq to fetch AI recommendations
    const apiMessages = [
      { role: "system", content: prompt }
    ];
    
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: apiMessages,
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const responseText = response.choices[0]?.message?.content;
    
    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        return res.json({
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          reason: data.reason || '',
          source: 'AI'
        });
      } catch (parseError) {
        console.error('JSON parsing failed. Raw response:', responseText, parseError);
        // Fallback to regex matching if JSON mode somehow returned text wrappers
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[0]);
            return res.json({
              suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
              reason: data.reason || '',
              source: 'AI'
            });
          } catch (innerError) {
            console.error('Fallback JSON parsing failed:', innerError);
          }
        }
      }
    }
    
    return res.json({ suggestions: [], reason: 'No recommendations found', source: 'None' });
    
  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ message: error.message });
  }
};

