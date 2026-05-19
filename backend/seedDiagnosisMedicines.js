import mongoose from 'mongoose';
import DiagnosisMaster from './models/DiagnosisMaster.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const dbURI =
  process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/cms';

// Use the exact table the user provided, parsing medicines string into array
const data = [
  { name: "Migraine", meds: ["Sumatriptan", "rizatriptan", "propranolol (prophylaxis)", "topiramate"] },
  { name: "Tension headache", meds: ["Paracetamol", "NSAIDs", "physiotherapy"] },
  { name: "Epilepsy / seizures", meds: ["Carbamazepine", "phenytoin", "valproic acid", "levetiracetam"] },
  { name: "Depression", meds: ["Sertraline", "fluoxetine", "escitalopram", "amitriptyline"] },
  { name: "Anxiety / GAD", meds: ["Sertraline", "paroxetine", "alprazolam (short-term)", "buspirone"] },
  { name: "Panic disorder", meds: ["SSRIs", "alprazolam", "clonazepam"] },
  { name: "Bipolar disorder", meds: ["Lithium", "valproate", "olanzapine", "quetiapine"] },
  { name: "Schizophrenia", meds: ["Olanzapine", "risperidone", "quetiapine", "clozapine"] },
  { name: "OCD", meds: ["SSRIs", "clomipramine", "CBT"] },
  { name: "ADHD", meds: ["Methylphenidate", "amphetamine", "atomoxetine"] },
  { name: "Insomnia", meds: ["Zolpidem", "triazolam", "zopiclone", "melatonin"] },
  { name: "Parkinson’s disease", meds: ["Levodopa + carbidopa", "pramipexole", "ropinirole"] },
  { name: "Alzheimer’s disease", meds: ["Donepezil", "rivastigmine", "memantine"] },
  { name: "Dementia (other)", meds: ["cholinesterase inhibitors"] },
  { name: "Stroke (ischemic)", meds: ["Aspirin", "clopidogrel", "statins"] },
  { name: "Epileptic seizure (acute)", meds: ["Lorazepam IV", "phenytoin", "valproate"] },
  { name: "Status epilepticus", meds: ["Lorazepam", "phenytoin", "levetiracetam"] },
  { name: "Neuropathic pain", meds: ["Pregabalin", "gabapentin", "duloxetine", "amitriptyline"] },
  { name: "Trigeminal neuralgia", meds: ["Carbamazepine", "gabapentin", "baclofen"] },
  { name: "Multiple sclerosis", meds: ["Interferons", "glatiramer", "fingolimod", "natalizumab"] },
  { name: "Myasthenia gravis", meds: ["Pyridostigmine", "azathioprine", "prednisolone"] },
  { name: "Benign prostatic hyperplasia (BPH)", meds: ["Tamsulosin", "alfuzosin", "finasteride", "dutasteride"] },
  { name: "Erectile dysfunction", meds: ["Sildenafil", "tadalafil", "vardenafil"] },
  { name: "Premature ejaculation", meds: ["paroxetine", "sertraline", "topical anesthetics"] },
  { name: "Hypogonadism (male)", meds: ["Testosterone injections", "Testosterone gels"] },
  { name: "Polycystic ovary syndrome (PCOS)", meds: ["Metformin", "oral-contraceptive pills", "spironolactone"] },
  { name: "Endometriosis", meds: ["Oral contraceptives", "GnRH analogs", "progestins"] },
  { name: "Menopause symptoms", meds: ["Estrogen", "combined HRT", "SSRIs"] },
  { name: "Infertility (unexplained)", meds: ["Clomiphene", "letrozole", "gonadotropins"] },
  { name: "Fibroids (menstrual bleeding)", meds: ["Tranexamic acid", "NSAIDs", "GnRH analogs"] },
  { name: "Menstrual pain (dysmenorrhea)", meds: ["NSAIDs", "oral contraceptives"] },
  { name: "Heavy menstrual bleeding", meds: ["Tranexamic acid", "NSAIDs", "progestins", "oral contraceptives"] },
  { name: "Premenstrual syndrome (PMS)", meds: ["SSRIs", "NSAIDs", "vitamin B6"] },
  { name: "Allergic rhinitis (hay fever)", meds: ["Cetirizine", "loratadine", "fexofenadine", "steroid nasal sprays"] },
  { name: "Asthma", meds: ["Salbutamol inhaler", "beclomethasone", "budesonide", "montelukast"] },
  { name: "COPD", meds: ["Salbutamol", "ipratropium", "budesonide/formoterol", "roflumilast"] },
  { name: "Chronic cough", meds: ["asthma tx", "GERD tx", "post-nasal drip tx"] },
  { name: "Anaphylaxis (allergy emergency)", meds: ["Adrenaline (epinephrine) injection", "antihistamines", "steroids"] },
  { name: "Vitamin deficiency (general)", meds: ["Multivitamins"] },
  { name: "Smoking cessation", meds: ["Nicotine patches", "varenicline", "bupropion"] },
  { name: "Alcohol withdrawal", meds: ["Chlordiazepoxide", "thiamine", "multivitamins"] },
  { name: "Opioid addiction / withdrawal", meds: ["Buprenorphine-naloxone", "methadone", "naltrexone"] },
  { name: "Overdose (general)", meds: ["naloxone"] },

  // Common cold, fever, infections
  { name: "Common cold", meds: ["Paracetamol", "NSAIDs", "decongestants", "antihistamines"] },
  { name: "Influenza (flu)", meds: ["Oseltamivir", "zanamivir", "paracetamol"] },
  { name: "Viral fever (undifferentiated)", meds: ["Paracetamol", "ORS", "rest"] },
  { name: "Bacterial pneumonia", meds: ["Amoxicillin", "azithromycin", "ceftriaxone", "doxycycline"] },
  { name: "Typhoid fever", meds: ["Ciprofloxacin", "azithromycin", "ceftriaxone"] },
  { name: "Malaria", meds: ["Artemether-lumefantrine", "chloroquine", "primaquine"] },
  { name: "Dengue fever", meds: ["Paracetamol", "fluids"] },
  { name: "Chikungunya", meds: ["Paracetamol", "fluids", "NSAIDs symptomatically"] },
  { name: "Tuberculosis (TB)", meds: ["Isoniazid", "rifampicin", "pyrazinamide", "ethambutol"] },
  { name: "UTI (urinary tract infection)", meds: ["Nitrofurantoin", "cephalexin", "ciprofloxacin", "cotrimoxazole"] },
  { name: "Bacterial tonsillitis", meds: ["Amoxicillin", "penicillin", "azithromycin if allergic"] },
  { name: "Sinusitis (bacterial)", meds: ["Amoxicillin-clavulanate", "cefuroxime", "doxycycline"] },
  { name: "Otitis media", meds: ["Amoxicillin", "cefdinir", "paracetamol"] },
  { name: "Conjunctivitis (bacterial)", meds: ["Chloramphenicol eye drops", "ciprofloxacin drops"] },
  { name: "Herpes simplex (oral/genital)", meds: ["Acyclovir", "valacyclovir", "topical antivirals"] },
  { name: "Shingles (herpes zoster)", meds: ["Acyclovir", "valacyclovir", "pregabalin for pain"] },

  // Cardiovascular, BP, diabetes, metabolic
  { name: "Hypertension (high BP)", meds: ["Amlodipine", "losartan", "atenolol", "telmisartan", "hydrochlorothiazide"] },
  { name: "Heart failure", meds: ["Furosemide", "spironolactone", "carvedilol", "ramipril"] },
  { name: "Stable angina", meds: ["Isosorbide dinitrate", "amlodipine", "atenolol", "aspirin"] },
  { name: "Acute myocardial infarction (MI)", meds: ["Aspirin", "clopidogrel", "statins", "heparin", "nitrates"] },
  { name: "Atrial fibrillation", meds: ["Metoprolol", "digoxin", "warfarin", "apixaban", "rivaroxaban"] },
  { name: "Deep vein thrombosis (DVT)", meds: ["Rivaroxaban", "apixaban", "enoxaparin", "warfarin"] },
  { name: "Pulmonary embolism", meds: ["Enoxaparin", "heparin", "warfarin", "DOACs"] },
  { name: "Hyperlipidemia (high cholesterol)", meds: ["Atorvastatin", "rosuvastatin", "fenofibrate", "ezetimibe"] },
  { name: "Type 2 diabetes", meds: ["Metformin", "gliclazide", "glimepiride", "insulin"] },
  { name: "Type 1 diabetes", meds: ["Insulin (regular, NPH, glargine, aspart)"] },
  { name: "Diabetic neuropathy", meds: ["Pregabalin", "gabapentin", "duloxetine"] },
  { name: "Hypothyroidism", meds: ["Levothyroxine"] },
  { name: "Hyperthyroidism", meds: ["Carbimazole", "methimazole", "propranolol"] },
  { name: "Gout", meds: ["Allopurinol", "colchicine", "indomethacin", "prednisolone"] },
  { name: "Iron-deficiency anemia", meds: ["Ferrous sulfate", "folic acid"] },
  { name: "Vitamin B12 deficiency", meds: ["Cyanocobalamin"] },
  { name: "Vitamin D deficiency", meds: ["Cholecalciferol (vitamin D3)"] },
  { name: "Osteoporosis", meds: ["Alendronate", "risedronate", "calcium + vitamin D"] },

  // GI, liver, kidney
  { name: "Dyspepsia / acidity", meds: ["Ranitidine", "omeprazole", "antacids"] },
  { name: "Gastritis", meds: ["Omeprazole", "pantoprazole", "sucralfate"] },
  { name: "Peptic ulcer disease", meds: ["PPIs", "amoxicillin", "metronidazole", "clarithromycin"] },
  { name: "GERD", meds: ["PPIs", "H2-blockers", "antacids"] },
  { name: "Constipation", meds: ["Lactulose", "senna", "bisacodyl"] },
  { name: "Diarrhea (acute)", meds: ["ORS", "loperamide", "zinc"] },
  { name: "Bacterial gastroenteritis", meds: ["Ciprofloxacin", "azithromycin", "metronidazole"] },
  { name: "Inflammatory bowel disease (IBD)", meds: ["Mesalazine", "corticosteroids", "azathioprine"] },
  { name: "Ulcerative colitis", meds: ["Mesalazine", "sulfasalazine", "corticosteroids"] },
  { name: "Crohn’s disease", meds: ["Mesalazine", "corticosteroids", "azathioprine"] },
  { name: "Irritable bowel syndrome (IBS)", meds: ["Loperamide", "peppermint oil", "low-dose antidepressants"] },
  { name: "Acute hepatitis (viral)", meds: ["Supportive care"] },
  { name: "Chronic hepatitis B", meds: ["Tenofovir", "entecavir"] },
  { name: "Chronic hepatitis C", meds: ["Sofosbuvir-based regimens"] },
  { name: "Cirrhosis", meds: ["Spironolactone", "propranolol", "lactulose"] },
  { name: "Ascites", meds: ["Spironolactone + furosemide"] },
  { name: "Hepatic encephalopathy", meds: ["Lactulose", "rifaximin"] },
  { name: "Acute cholecystitis", meds: ["Ceftriaxone", "metronidazole", "analgesics"] },
  { name: "Acute pancreatitis", meds: ["IV fluids", "analgesics"] },
  { name: "Chronic kidney disease", meds: ["Antihypertensives", "diuretics", "phosphate binders"] },
  { name: "Nephrotic syndrome", meds: ["Corticosteroids", "immunosuppressants", "diuretics"] },
  { name: "Glomerulonephritis", meds: ["Corticosteroids", "cyclophosphamide", "azathioprine"] },
  { name: "Kidney stones (calcium)", meds: ["Thiazide diuretics", "allopurinol"] },
  { name: "Overactive bladder", meds: ["Oxybutynin", "tolterodine"] },
  { name: "Prostatitis (bacterial)", meds: ["Ciprofloxacin", "trimethoprim-sulfamethoxazole"] },

  // Musculoskeletal, joints, skin, eyes
  { name: "Osteoarthritis", meds: ["Paracetamol", "ibuprofen", "diclofenac", "glucosamine"] },
  { name: "Rheumatoid arthritis", meds: ["Methotrexate", "sulfasalazine", "hydroxychloroquine"] },
  { name: "Gouty arthritis", meds: ["Colchicine", "NSAIDs", "allopurinol"] },
  { name: "Low back pain", meds: ["Paracetamol", "NSAIDs", "muscle relaxants"] },
  { name: "Neck pain / cervical spondylosis", meds: ["Paracetamol", "NSAIDs", "muscle relaxants"] },
  { name: "Psoriasis", meds: ["Topical steroids", "methotrexate", "biologics"] },
  { name: "Eczema / atopic dermatitis", meds: ["Topical steroids", "emollients"] },
  { name: "Acne", meds: ["Benzoyl peroxide", "clindamycin", "tretinoin"] },
  { name: "Rosacea", meds: ["Metronidazole gel", "azelaic acid", "doxycycline"] },
  { name: "Seborrheic dermatitis", meds: ["Ketoconazole shampoo", "topical steroids"] },
  { name: "Urticaria (hives)", meds: ["Cetirizine", "loratadine", "prednisolone"] },
  { name: "Fungal skin infections", meds: ["Clotrimazole", "terbinafine", "fluconazole"] },
  { name: "Scabies", meds: ["Permethrin cream", "ivermectin"] },
  { name: "Lice (head/body)", meds: ["Permethrin", "malathion", "ivermectin"] },
  { name: "Skin abscess", meds: ["Incision and drainage", "cephalexin if needed"] },
  { name: "Cellulitis", meds: ["Cephalexin", "cloxacillin", "clindamycin"] },
  { name: "Lupus (SLE)", meds: ["Hydroxychloroquine", "corticosteroids", "azathioprine"] },
  { name: "Dry eye", meds: ["Artificial tears", "cyclosporine drops"] },
  { name: "Glaucoma (open-angle)", meds: ["Timolol eye drops", "brimonidine", "latanoprost"] },

  // Miscellaneous (endocrine, ENT, allergy, etc.)
  { name: "Hypogonadism (female)", meds: ["Estrogen", "progesterone"] },
  { name: "Hypopituitarism", meds: ["Corticosteroids", "levothyroxine", "sex hormones"] },
  { name: "Addison’s disease", meds: ["Hydrocortisone", "fludrocortisone"] },
  { name: "Cushing’s syndrome", meds: ["Ketoconazole", "mifepristone"] },
  { name: "Hypercalcemia", meds: ["IV fluids", "bisphosphonates"] },
  { name: "Hypocalcemia", meds: ["Calcium gluconate", "vitamin D"] },
  { name: "Hyperkalemia", meds: ["IV calcium gluconate", "insulin + glucose", "salbutamol"] },
  { name: "Hypokalemia", meds: ["Oral potassium supplements", "IV potassium if severe"] },
  { name: "Hypomagnesemia", meds: ["Magnesium oxide", "IV magnesium"] },
  { name: "Hypophosphatemia", meds: ["Oral phosphate supplements", "IV phosphate"] },
  { name: "Sepsis (bacterial)", meds: ["Ceftriaxone", "piperacillin-tazobactam", "vancomycin if suspected MRSA"] },
  { name: "Community‑acquired pneumonia", meds: ["Amoxicillin", "azithromycin", "ceftriaxone"] },
  { name: "Osteomyelitis", meds: ["Flucloxacillin", "clindamycin", "vancomycin"] },
  { name: "Meningitis (bacterial)", meds: ["Ceftriaxone", "ampicillin", "dexamethasone"] },
  { name: "Encephalitis (viral)", meds: ["Acyclovir", "supportive care"] },
  { name: "Pre‑eclampsia", meds: ["Labetalol", "methyldopa", "magnesium sulfate"] },
  { name: "Deep fungal infection", meds: ["Amphotericin B", "fluconazole", "voriconazole"] },
  { name: "Tinea corporis (ringworm)", meds: ["Terbinafine", "clotrimazole"] },
  { name: "Onychomycosis", meds: ["Terbinafine", "itraconazole"] },
  { name: "Viral keratitis", meds: ["Acyclovir eye ointment"] },
  { name: "Cataract (symptomatic)", meds: ["No effective medical therapy; surgery"] },
  { name: "Myopia (nearsightedness)", meds: ["Glasses/contacts", "LASIK surgery"] },
  { name: "Hyperopia (farsightedness)", meds: ["Glasses/contacts"] },
  { name: "Glaucoma (angle closure)", meds: ["Timolol", "pilocarpine", "acetazolamide"] },
  { name: "Keratoconus", meds: ["Rigid gas permeable lenses", "cross‑linking"] },
  { name: "Dry skin", meds: ["Emollients", "moisturizers"] },
  { name: "Alopecia (androgenic)", meds: ["Minoxidil", "finasteride"] },
  { name: "Hirsutism", meds: ["Spironolactone", "oral contraceptives"] },
  { name: "Obesity (lifestyle‑based)", meds: ["Orlistat", "liraglutide", "semaglutide"] },
  { name: "Metabolic syndrome", meds: ["Metformin", "lifestyle, BP and lipid control"] },
  { name: "Paget’s disease of bone", meds: ["Alendronate", "etidronate"] },
  { name: "Chronic venous insufficiency", meds: ["Compression stockings", "flavonoids"] },
  { name: "Peripheral arterial disease (PAD)", meds: ["Aspirin", "clopidogrel", "statins"] },
  { name: "Raynaud’s phenomenon", meds: ["Nifedipine", "lifestyle avoidance"] },
  { name: "Benign skin lesion (wart)", meds: ["Salicylic acid", "cryotherapy"] },
  { name: "Hemorrhoids", meds: ["Topical steroids", "lidocaine", "stool softeners"] },
  { name: "Venous thromboembolism (VTE)", meds: ["Rivaroxaban", "apixaban", "enoxaparin"] },
  { name: "Atrial flutter", meds: ["Metoprolol", "digoxin", "dabigatran"] },
  { name: "Paroxysmal supraventricular tachycardia (PSVT)", meds: ["Adenosine", "metoprolol"] },
  { name: "Hypertrophic cardiomyopathy", meds: ["Metoprolol", "disopyramide", "amiodarone"] },
  { name: "Fabry disease", meds: ["Enzyme replacement therapy"] },
  { name: "Hereditary angioedema", meds: ["C1‑esterase inhibitor", "icatibant"] },
  { name: "Sarcoidosis", meds: ["Prednisolone", "methotrexate"] },
  { name: "Wilson’s disease", meds: ["D‑penicillamine", "zinc", "trientine"] },
  { name: "Hereditary hemochromatosis", meds: ["Phlebotomy", "chelation therapy"] },
  { name: "Cystic fibrosis", meds: ["Ivacaftor, tezacaftor, elexacaftor combinations", "inhaled antibiotics"] },
  { name: "Pulmonary hypertension", meds: ["Sildenafil", "bosentan", "epoprostenol"] },
  { name: "Interstitial lung disease", meds: ["Corticosteroids", "azathioprine", "pirfenidone, nintedanib"] },
  { name: "Pneumothorax (spontaneous)", meds: ["Oxygen", "chest tube if needed"] },
  { name: "Pleural effusion (transudate)", meds: ["Treat underlying cause (CHF, cirrhosis)"] },
  { name: "Pleural effusion (exudate)", meds: ["Treat underlying cause (TB, malignancy, pneumonia)"] },
  { name: "Pneumonia (hospital‑acquired)", meds: ["Piperacillin‑tazobactam", "meropenem", "vancomycin"] },
  { name: "Peritonitis", meds: ["Ceftriaxone", "ampicillin", "metronidazole"] },
  { name: "Diverticulitis", meds: ["Ciprofloxacin", "metronidazole"] },
  { name: "Hemorrhagic stroke", meds: ["Supportive care", "BP control"] },
  { name: "Subarachnoid hemorrhage", meds: ["Nimodipine", "BP control"] },
  { name: "Subdural hematoma", meds: ["Surgical evacuation", "supportive care"] },
  { name: "Epidural hematoma", meds: ["Surgical evacuation"] },

  // Pain, inflammation, small extra entries to reach ~200
  { name: "Acute low back strain", meds: ["Paracetamol", "NSAIDs", "heat therapy"] },
  { name: "Plantar fasciitis", meds: ["NSAIDs", "stretching, physiotherapy"] },
  { name: "Tendinitis (rotator cuff)", meds: ["NSAIDs", "physiotherapy"] },
  { name: "Bursitis", meds: ["NSAIDs", "corticosteroid injection"] },
  { name: "Gout flare", meds: ["NSAIDs", "colchicine", "prednisolone"] },
  { name: "Raynaud’s attack", meds: ["Nifedipine", "warmth"] },
  { name: "Complex regional pain syndrome (CRPS)", meds: ["Gabapentin", "amitriptyline", "physical therapy"] },
  { name: "Fibromyalgia", meds: ["Duloxetine", "pregabalin", "amitriptyline"] },
  { name: "Somatoform disorder", meds: ["SSRIs", "TCAs", "CBT"] },
  { name: "Body dysmorphic disorder", meds: ["SSRIs", "CBT"] },
  { name: "Eating disorder (anorexia)", meds: ["Nutritional rehabilitation", "SSRIs"] },
  { name: "Eating disorder (bulimia)", meds: ["SSRIs", "CBT"] },
  { name: "Seasonal affective disorder (SAD)", meds: ["SSRIs", "light therapy"] },
  { name: "Post‑traumatic stress disorder (PTSD)", meds: ["SSRIs", "prazosin", "CBT"] },
  { name: "Autism spectrum disorder (supportive)", meds: ["Risperidone", "aripiprazole"] },
  { name: "Parkinsonian tremor", meds: ["Propranolol", "primidone"] },
  { name: "Essential tremor", meds: ["Propranolol", "primidone"] },
  { name: "Hemifacial spasm", meds: ["Carbamazepine", "baclofen"] },
  { name: "Restless legs syndrome", meds: ["Gabapentin", "pramipexole"] }
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB...', dbURI);
    await mongoose.connect(dbURI);
    console.log('Connected.');

    let updatedCount = 0;
    let insertedCount = 0;

    for (const item of data) {
      const { name, meds } = item;

      const recommendedMedicines = meds.map(medName => ({
        name: medName.trim(),
        generic: medName.trim(),
        form: 'Tablet',
        strength: '',
        dose: '1-0-1',
        when: 'After Food',
        freq: 'Daily',
        dur: '5 Days'
      }));

      // Try to find existing by name case-insensitive
      const existing = await DiagnosisMaster.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (existing) {
        existing.recommendedMedicines = recommendedMedicines;
        await existing.save();
        updatedCount++;
        console.log(`Updated existing diagnosis: ${name}`);
      } else {
        const newDiag = new DiagnosisMaster({
          name: name,
          specialty: 'General',
          category: 'General',
          isGlobal: true,
          recommendedMedicines
        });
        await newDiag.save();
        insertedCount++;
        console.log(`Inserted new diagnosis: ${name}`);
      }
    }

    console.log(`\nDONE! Updated: ${updatedCount}, Inserted: ${insertedCount}`);
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seedData();