import ComplaintMaster from '../models/ComplaintMaster.js';

/**
 * Get all master complaints (Global + Organization-specific).
 */
export const getMasterComplaints = async (req, res) => {
  try {
    const complaints = await ComplaintMaster.find({
      $or: [
        { organizationId: null },
        { organizationId: req.tenantId }
      ],
      isActive: true
    }).sort({ category: 1, name: 1 });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching master complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add a new complaint to the master list for the organization.
 */
export const addMasterComplaint = async (req, res) => {
  try {
    const { name, category, keywords } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Complaint name is required' });
    }

    const normalizedName = name.trim();
    const existing = await ComplaintMaster.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      $or: [
        { organizationId: null },
        { organizationId: req.tenantId }
      ]
    });

    if (existing) {
      return res.status(409).json({ message: 'Complaint already exists in master list', complaint: existing });
    }

    const newComplaint = new ComplaintMaster({
      name: normalizedName,
      category: category || 'General',
      keywords: keywords || [],
      organizationId: req.tenantId
    });

    await newComplaint.save();
    res.status(201).json(newComplaint);
  } catch (error) {
    console.error('Error adding master complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Seed global complaints with the 50+ list.
 */
export const seedGlobalComplaints = async () => {
  try {
    const count = await ComplaintMaster.countDocuments({ organizationId: null });
    const hasDental = await ComplaintMaster.findOne({ name: 'Bleeding Gums', organizationId: null });
    if (count > 20 && hasDental) return; // Already seeded with dental list

    // Clear old list if exists or missing dental seed
    if (count > 0) await ComplaintMaster.deleteMany({ organizationId: null });

    const globals = [
      // GENERAL
      { name: 'Fever', category: 'General', keywords: ['bukhar', 'temperature', 'feverish', 'tapman'] },
      { name: 'Fever with Chills', category: 'General', keywords: ['bukhar thand ke sath', 'chills'] },
      { name: 'High Grade Fever', category: 'General', keywords: ['tej bukhar'] },
      { name: 'Low Grade Fever', category: 'General', keywords: ['halka bukhar'] },
      { name: 'Body Ache', category: 'General', keywords: ['badan dard', 'ang dard'] },
      { name: 'Weakness', category: 'General', keywords: ['kamzori', 'thakan'] },
      { name: 'Fatigue', category: 'General', keywords: ['thakavat', 'tiredness'] },
      { name: 'Loss of Appetite', category: 'General', keywords: ['bhook na lagna'] },
      { name: 'Weight Loss', category: 'General', keywords: ['vajan ghatna'] },
      { name: 'General Malaise', category: 'General', keywords: ['bechaini'] },

      // RESPIRATORY
      { name: 'Cough', category: 'Respiratory', keywords: ['khansi', 'dhasak'] },
      { name: 'Dry Cough', category: 'Respiratory', keywords: ['sukhi khansi'] },
      { name: 'Productive Cough', category: 'Respiratory', keywords: ['balgam wali khansi'] },
      { name: 'Cold', category: 'Respiratory', keywords: ['sardi', 'zukaam'] },
      { name: 'Running Nose', category: 'Respiratory', keywords: ['naak behna'] },
      { name: 'Sneezing', category: 'Respiratory', keywords: ['cheenk'] },
      { name: 'Breathlessness', category: 'Respiratory', keywords: ['saans phulna', 'dyspnea'] },
      { name: 'Wheezing', category: 'Respiratory', keywords: ['seeti jaisi awaaz'] },
      { name: 'Chest Congestion', category: 'Respiratory', keywords: ['seene mein jakdan'] },
      { name: 'Sore Throat', category: 'Respiratory', keywords: ['gala kharab', 'khich khich'] },

      // ENT
      { name: 'Nasal Blockage', category: 'ENT', keywords: ['naak band'] },
      { name: 'Ear Pain', category: 'ENT', keywords: ['kaan dard'] },
      { name: 'Ear Discharge', category: 'ENT', keywords: ['kaan behna'] },
      { name: 'Throat Pain', category: 'ENT', keywords: ['gale mein dard'] },
      { name: 'Hoarseness of Voice', category: 'ENT', keywords: ['awaaz baithna'] },
      { name: 'Tonsil Swelling', category: 'ENT', keywords: ['tonsils'] },
      { name: 'Sinus Pain', category: 'ENT', keywords: ['sinus'] },

      // GASTROINTESTINAL
      { name: 'Vomiting', category: 'Gastrointestinal', keywords: ['ulti', 'nausea'] },
      { name: 'Nausea', category: 'Gastrointestinal', keywords: ['जी मिचलाना', 'ji machlana'] },
      { name: 'Loose Motion', category: 'Gastrointestinal', keywords: ['dast', 'loose stool', 'diarrhea'] },
      { name: 'Constipation', category: 'Gastrointestinal', keywords: ['kabz'] },
      { name: 'Abdominal Pain', category: 'Gastrointestinal', keywords: ['pet dard', 'stomach pain'] },
      { name: 'Upper Abdominal Pain', category: 'Gastrointestinal', keywords: ['pet ke upri hisse mein dard'] },
      { name: 'Lower Abdominal Pain', category: 'Gastrointestinal', keywords: ['pet ke nichle hisse mein dard'] },
      { name: 'Acidity', category: 'Gastrointestinal', keywords: ['jalan', 'gas'] },
      { name: 'Bloating', category: 'Gastrointestinal', keywords: ['pet phulna'] },
      { name: 'Indigestion', category: 'Gastrointestinal', keywords: ['pachan ki dikkat'] },
      { name: 'Burning Abdomen', category: 'Gastrointestinal', keywords: ['pet mein jalan'] },
      { name: 'Gastric Problem', category: 'Gastrointestinal', keywords: ['gas ki dikkat'] },

      // CVS
      { name: 'Chest Pain', category: 'CVS', keywords: ['seene mein dard'] },
      { name: 'Palpitations', category: 'CVS', keywords: ['dil ki dhadkan tej'] },
      { name: 'High Blood Pressure', category: 'CVS', keywords: ['high bp'] },
      { name: 'Low Blood Pressure', category: 'CVS', keywords: ['low bp'] },
      { name: 'Swelling in Legs', category: 'CVS', keywords: ['pairon mein sujan'] },

      // NEUROLOGY
      { name: 'Headache', category: 'Neurology', keywords: ['sir dard'] },
      { name: 'Migraine', category: 'Neurology', keywords: ['migraine'] },
      { name: 'Dizziness', category: 'Neurology', keywords: ['chakkar'] },
      { name: 'Vertigo', category: 'Neurology', keywords: ['chakkar aana'] },
      { name: 'Numbness', category: 'Neurology', keywords: ['sunn hona'] },
      { name: 'Tremors', category: 'Neurology', keywords: ['kampan'] },
      { name: 'Fits / Seizure', category: 'Neurology', keywords: ['daure'] },

      // MUSCULOSKELETAL
      { name: 'Joint Pain', category: 'Musculoskeletal', keywords: ['jodon mein dard'] },
      { name: 'Knee Pain', category: 'Musculoskeletal', keywords: ['ghutno mein dard'] },
      { name: 'Back Pain', category: 'Musculoskeletal', keywords: ['peeth dard', 'kamar dard'] },
      { name: 'Neck Pain', category: 'Musculoskeletal', keywords: ['gardan mein dard'] },
      { name: 'Shoulder Pain', category: 'Musculoskeletal', keywords: ['kandhe mein dard'] },
      { name: 'Muscle Pain', category: 'Musculoskeletal', keywords: ['manspeshiyon mein dard'] },

      // SKIN
      { name: 'Skin Rash', category: 'Skin', keywords: ['chakatte'] },
      { name: 'Itching', category: 'Skin', keywords: ['khujli'] },
      { name: 'Boils', category: 'Skin', keywords: ['phunsiyan'] },
      { name: 'Allergy', category: 'Skin', keywords: ['allergy'] },
      { name: 'Fungal Infection', category: 'Skin', keywords: ['daadh khaj'] },

      // UROLOGY
      { name: 'Burning Urination', category: 'Urology', keywords: ['peshab mein jalan'] },
      { name: 'Frequent Urination', category: 'Urology', keywords: ['baar baar peshab ana'] },
      { name: 'Blood in Urine', category: 'Urology', keywords: ['peshab mein khoon'] },

      // GYNECOLOGY
      { name: 'Irregular Periods', category: 'Gynecology', keywords: ['periods ki dikkat'] },
      { name: 'White Discharge', category: 'Gynecology', keywords: ['safed pani'] },
      { name: 'Lower Abdomen Pain in Periods', category: 'Gynecology', keywords: ['periods mein dard'] },

      // PEDIATRIC
      { name: 'Crying Excessively', category: 'Pediatric', keywords: ['bacha bahut ro raha hai'] },
      { name: 'Feeding Difficulty', category: 'Pediatric', keywords: ['doodh nahi pee raha'] },

      // CHRONIC
      { name: 'Sugar Follow Up', category: 'Chronic', keywords: ['diabetes follow up'] },
      { name: 'BP Follow Up', category: 'Chronic', keywords: ['bp checkup'] },

      // EYE/DENTAL/PSYCH
      { name: 'Eye Redness', category: 'Eye', keywords: ['aankh lal'] },
      { name: 'Tooth Pain', category: 'Dental', keywords: ['daant dard', 'tooth pain'] },
      { name: 'Bleeding Gums', category: 'Dental', keywords: ['khoon aana', 'bleeding gums', 'gums bleeding'] },
      { name: 'Tooth Sensitivity', category: 'Dental', keywords: ['sensitivity', 'thanda garam', 'tooth sensitivity'] },
      { name: 'Swollen Gums', category: 'Dental', keywords: ['sujan gums', 'swollen gums', 'masudo me sujan'] },
      { name: 'Bad Breath', category: 'Dental', keywords: ['bad breath', 'muh se badbu', 'halitosis'] },
      { name: 'Loose Tooth', category: 'Dental', keywords: ['loose tooth', 'daant hilna'] },
      { name: 'Broken / Chipped Tooth', category: 'Dental', keywords: ['broken tooth', 'chipped tooth', 'daant tutna'] },
      { name: 'Cavity / Tooth Decay', category: 'Dental', keywords: ['cavity', 'tooth decay', 'daant me kida'] },
      { name: 'Mouth Ulcer', category: 'Dental', keywords: ['ulcer', 'chale', 'mouth ulcer'] },
      { name: 'Gum Pain', category: 'Dental', keywords: ['gum pain', 'masudo me dard'] },
      { name: 'Wisdom Tooth Pain', category: 'Dental', keywords: ['wisdom tooth', 'akal dad me dard'] },
      { name: 'Anxiety', category: 'Psychological', keywords: ['ghabrahat'] },
      { name: 'Sleep Disturbance', category: 'Psychological', keywords: ['neend na aana'] },
      { name: 'No Specific Complaint', category: 'Other', keywords: ['routine checkup'] },

      // --- DERMATOLOGY ---
      // ITCHING
      { name: 'Itching', category: 'Derm: Itching', keywords: ['khujli'] },
      { name: 'Severe Itching', category: 'Derm: Itching', keywords: ['tej khujli'] },
      { name: 'Night Itching', category: 'Derm: Itching', keywords: ['raat ko khujli'] },
      { name: 'Generalized Pruritus', category: 'Derm: Itching', keywords: ['poore badan mein khujli'] },
      { name: 'Scalp Itching', category: 'Derm: Itching', keywords: ['sir mein khujli'] },
      // RASH
      { name: 'Skin Rash', category: 'Derm: Rash', keywords: ['chakatte'] },
      { name: 'Allergic Rash', category: 'Derm: Rash', keywords: ['allergy wala rash'] },
      { name: 'Heat Rash', category: 'Derm: Rash', keywords: ['ghamauri'] },
      // ACNE
      { name: 'Acne', category: 'Derm: Acne', keywords: ['muhase', 'pimples'] },
      { name: 'Acne Scars', category: 'Derm: Acne', keywords: ['muhaso ke nishan'] },
      { name: 'Melasma', category: 'Derm: Acne', keywords: ['facial pigmentation'] },
      // FUNGAL
      { name: 'Fungal Infection', category: 'Derm: Fungal', keywords: ['daadh khaj'] },
      { name: 'Ringworm', category: 'Derm: Fungal', keywords: ['round rash'] },
      // ALLERGY
      { name: 'Urticaria', category: 'Derm: Allergy', keywords: ['hives', 'pitthi'] },
      // ECZEMA
      { name: 'Eczema', category: 'Derm: Eczema', keywords: ['khujli wale patches'] },
      // PSORIASIS
      { name: 'Psoriasis', category: 'Derm: Psoriasis', keywords: ['scaly skin'] },
      // PIGMENTATION
      { name: 'White Patches', category: 'Derm: Pigmentation', keywords: ['safed daag', 'vitiligo'] },
      // HAIR
      { name: 'Hair Fall', category: 'Derm: Hair', keywords: ['baal jhadna'] },
      { name: 'Dandruff', category: 'Derm: Hair', keywords: ['rusi'] },
      // NAIL
      { name: 'Nail Fungal Infection', category: 'Derm: Nail', keywords: ['nakhun mein fungal'] },
      // BOILS
      { name: 'Boils', category: 'Derm: Boils', keywords: ['phunsiyan', 'baltod'] },
      // WARTS
      { name: 'Wart', category: 'Derm: Warts', keywords: ['massa'] },
      { name: 'Skin Tag', category: 'Derm: Warts', keywords: ['raised growth'] },
      { name: 'Corn', category: 'Derm: Warts', keywords: ['corn on foot'] },
      // SENSATION
      { name: 'Burning Sensation', category: 'Derm: Sensation', keywords: ['jalan'] },
      { name: 'Tingling on Skin', category: 'Derm: Sensation', keywords: ['cheenti chalna'] },
      // ULCER
      { name: 'Non Healing Ulcer', category: 'Derm: Ulcer', keywords: ['zakhm jo bhar nahi raha'] },
      // SWEATING
      { name: 'Excessive Sweating', category: 'Derm: Sweating', keywords: ['bahut pasina'] }
    ];

    await ComplaintMaster.insertMany(globals.map(g => ({ ...g, organizationId: null })));
    console.log('[Seed] 120+ Global complaints seeded successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding complaints:', error);
  }
};
