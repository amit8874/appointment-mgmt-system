import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Medicine from './models/Medicine.js';

dotenv.config({ path: './backend/.env' });

const HANDWRITTEN_MEDICINES = [
  {
    name: 'Caremox AG Plus',
    genericName: 'Amoxicillin 500mg & Potassium Clavulanate 125mg',
    type: 'Tablet',
    dose: '625mg',
    category: 'Antibiotic',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Broad spectrum antibiotic for dental and maxillofacial infections'
  },
  {
    name: 'Yenfenac SP',
    genericName: 'Aceclofenac 100mg, Paracetamol 325mg & Serratiopeptidase 15mg',
    type: 'Tablet',
    dose: '1 Tab',
    category: 'Pain Relief & Anti-inflammatory',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Fast relief from dental pain, swelling and post-procedure edema'
  },
  {
    name: 'Densoform (Gumpaint)',
    genericName: 'Tannic Acid, Iodine, Menthol & Thymol Glycerin',
    type: 'Gel',
    dose: 'Few drops',
    category: 'Dental Gum Paint',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Astringent and antiseptic paint for inflamed, bleeding gums and aphthous ulcers'
  },
  {
    name: 'Frutta - 9G',
    genericName: 'Ginseng, Ginkgo Biloba, Green Tea, Grape Seed with 9G Antioxidants & Minerals',
    type: 'Capsule',
    dose: '1 Cap',
    category: 'Antioxidant & Multivitamin',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Immunity booster and antioxidant supplement supporting periodontal healing'
  },
  {
    name: 'Denseal',
    genericName: 'Potassium Nitrate & Sodium Monofluorophosphate Desensitizing Paste',
    type: 'Gel',
    dose: 'Pea-size',
    category: 'Dental Desensitizer',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Effective desensitizing paste for dentin hypersensitivity and enamel erosion'
  },
  {
    name: 'Lycoyen',
    genericName: 'Lycopene with Multivitamins, Minerals & Zinc',
    type: 'Capsule',
    dose: '1 Cap',
    category: 'Nutritional Supplement',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Antioxidant for oral submucous fibrosis (OSMF) and tissue rejuvenation'
  },
  {
    name: 'Roben DSR',
    genericName: 'Rabeprazole Sodium 20mg & Domperidone 30mg SR',
    type: 'Capsule',
    dose: '1 Cap',
    category: 'Antacid / Anti-Reflux',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Gastroprotective antacid to prevent NSAID-induced gastric irritation'
  },
  {
    name: 'Pantoyen DSR',
    genericName: 'Pantoprazole 40mg & Domperidone 30mg SR',
    type: 'Capsule',
    dose: '1 Cap',
    category: 'Antacid / Anti-Reflux',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Proton pump inhibitor and prokinetic for acidity and nausea prevention'
  },
  {
    name: 'Reol LSR',
    genericName: 'Rabeprazole Sodium 20mg & Levosulpiride 75mg SR',
    type: 'Capsule',
    dose: '1 Cap',
    category: 'Gastroprokinetic & Antacid',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Advanced antacid and prokinetic for dyspepsia and GERD'
  },
  {
    name: 'Yenfenac P',
    genericName: 'Aceclofenac 100mg & Paracetamol 325mg',
    type: 'Tablet',
    dose: '1 Tab',
    category: 'Pain Relief (Analgesic)',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Analgesic and antipyretic for moderate to severe toothache'
  },
  {
    name: 'Dencef (200)',
    genericName: 'Cefixime 200mg',
    type: 'Tablet',
    dose: '200mg',
    category: 'Cephalosporin Antibiotic',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Potent cephalosporin antibiotic for resistant dental infections'
  },
  {
    name: 'Odclin Plus',
    genericName: 'Clindamycin Hydrochloride 300mg',
    type: 'Capsule',
    dose: '300mg',
    category: 'Dental Antibiotic',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'First-line antibiotic for anaerobic dental infections and penicillin-allergic patients'
  },
  {
    name: 'Oldine - MW',
    genericName: 'Povidone Iodine 2% w/v Germicide Gargle & Mouthwash',
    type: 'Liquid',
    dose: '10 ml',
    category: 'Antiseptic Gargle / Mouthwash',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Antiseptic gargle for sore throat, post-extraction cleaning and oral infections'
  },
  {
    name: 'Olsept - M.W',
    genericName: 'Chlorhexidine Gluconate 0.2% w/v Antiseptic Mouthwash',
    type: 'Liquid',
    dose: '10 ml',
    category: 'Antiseptic Mouthwash',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Gold standard anti-plaque and anti-gingivitis oral rinse'
  },
  {
    name: 'Warren Sensitive Ortho',
    genericName: 'Ultra Soft Sensitive & Orthodontic Toothbrush & Care Paste',
    type: 'Other',
    dose: '1 Unit',
    category: 'Oral Hygiene / Ortho Care',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Specially engineered for sensitive teeth and patients with orthodontic braces'
  },
  {
    name: 'Nemflam Plus',
    genericName: 'Nimesulide 100mg & Paracetamol 325mg',
    type: 'Tablet',
    dose: '1 Tab',
    category: 'NSAID / Pain Relief',
    isCommon: true,
    isGlobal: true,
    status: 'Active',
    description: 'Fast acting NSAID for acute dental pain and inflammation'
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cms');
  console.log('Connected to MongoDB');

  for (const item of HANDWRITTEN_MEDICINES) {
    const existing = await Medicine.findOne({ 
      name: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });

    if (existing) {
      await Medicine.updateOne(
        { _id: existing._id },
        { $set: { ...item, isCommon: true, isGlobal: true, status: 'Active' } }
      );
      console.log(`Updated: ${item.name}`);
    } else {
      await Medicine.create({
        ...item,
        isCommon: true,
        isGlobal: true,
        status: 'Active',
        usageCount: 10
      });
      console.log(`Created: ${item.name}`);
    }
  }

  const total = await Medicine.countDocuments();
  console.log(`Total medicines in DB: ${total}`);
  await mongoose.disconnect();
}

seed().catch(console.error);
