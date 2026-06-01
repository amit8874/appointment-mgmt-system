// ============================================================================
// DENTAL UTILITIES & CONFIGURATIONS (32 Permanent Teeth Mapping System)
// ============================================================================

// The 32 permanent teeth defined with FDI, Universal, and Palmer notations.
// FDI: Two-digit notation (e.g. 11-18 for Upper Right quadrant)
// Universal: US standard (1-32 clockwise starting from upper right wisdom tooth)
// Palmer: Quadrant symbol + number 1-8 from midline
export const TEETH_DEFS = [
  // ================= UPPER RIGHT QUADRANT (FDI 18 - 11) =================
  { id: '18', fdi: '18', universal: '1', palmer: 'UR8', name: 'Maxillary Right Third Molar (Wisdom)', shortName: 'UR 3rd Molar', quadrant: 'UR', type: 'molar', arch: 'Upper' },
  { id: '17', fdi: '17', universal: '2', palmer: 'UR7', name: 'Maxillary Right Second Molar', shortName: 'UR 2nd Molar', quadrant: 'UR', type: 'molar', arch: 'Upper' },
  { id: '16', fdi: '16', universal: '3', palmer: 'UR6', name: 'Maxillary Right First Molar', shortName: 'UR 1st Molar', quadrant: 'UR', type: 'molar', arch: 'Upper' },
  { id: '15', fdi: '15', universal: '4', palmer: 'UR5', name: 'Maxillary Right Second Premolar', shortName: 'UR 2nd Premolar', quadrant: 'UR', type: 'premolar', arch: 'Upper' },
  { id: '14', fdi: '14', universal: '5', palmer: 'UR4', name: 'Maxillary Right First Premolar', shortName: 'UR 1st Premolar', quadrant: 'UR', type: 'premolar', arch: 'Upper' },
  { id: '13', fdi: '13', universal: '6', palmer: 'UR3', name: 'Maxillary Right Canine', shortName: 'UR Canine', quadrant: 'UR', type: 'canine', arch: 'Upper' },
  { id: '12', fdi: '12', universal: '7', palmer: 'UR2', name: 'Maxillary Right Lateral Incisor', shortName: 'UR Lateral Incisor', quadrant: 'UR', type: 'incisor', arch: 'Upper' },
  { id: '11', fdi: '11', universal: '8', palmer: 'UR1', name: 'Maxillary Right Central Incisor', shortName: 'UR Central Incisor', quadrant: 'UR', type: 'incisor', arch: 'Upper' },

  // ================= UPPER LEFT QUADRANT (FDI 21 - 28) =================
  { id: '21', fdi: '21', universal: '9', palmer: 'UL1', name: 'Maxillary Left Central Incisor', shortName: 'UL Central Incisor', quadrant: 'UL', type: 'incisor', arch: 'Upper' },
  { id: '22', fdi: '22', universal: '10', palmer: 'UL2', name: 'Maxillary Left Lateral Incisor', shortName: 'UL Lateral Incisor', quadrant: 'UL', type: 'incisor', arch: 'Upper' },
  { id: '23', fdi: '23', universal: '11', palmer: 'UL3', name: 'Maxillary Left Canine', shortName: 'UL Canine', quadrant: 'UL', type: 'canine', arch: 'Upper' },
  { id: '24', fdi: '24', universal: '12', palmer: 'UL4', name: 'Maxillary Left First Premolar', shortName: 'UL 1st Premolar', quadrant: 'UL', type: 'premolar', arch: 'Upper' },
  { id: '25', fdi: '25', universal: '13', palmer: 'UL5', name: 'Maxillary Left Second Premolar', shortName: 'UL 2nd Premolar', quadrant: 'UL', type: 'premolar', arch: 'Upper' },
  { id: '26', fdi: '26', universal: '14', palmer: 'UL6', name: 'Maxillary Left First Molar', shortName: 'UL 1st Molar', quadrant: 'UL', type: 'molar', arch: 'Upper' },
  { id: '27', fdi: '27', universal: '15', palmer: 'UL7', name: 'Maxillary Left Second Molar', shortName: 'UL 2nd Molar', quadrant: 'UL', type: 'molar', arch: 'Upper' },
  { id: '28', fdi: '28', universal: '16', palmer: 'UL8', name: 'Maxillary Left Third Molar (Wisdom)', shortName: 'UL 3rd Molar', quadrant: 'UL', type: 'molar', arch: 'Upper' },

  // ================= LOWER LEFT QUADRANT (FDI 38 - 31) =================
  // Ordered left-to-right from midline to back, or back to midline. 
  // Standard Lower Arch order visually: 48 to 41, then 31 to 38.
  { id: '31', fdi: '31', universal: '24', palmer: 'LL1', name: 'Mandibular Left Central Incisor', shortName: 'LL Central Incisor', quadrant: 'LL', type: 'incisor', arch: 'Lower' },
  { id: '32', fdi: '32', universal: '23', palmer: 'LL2', name: 'Mandibular Left Lateral Incisor', shortName: 'LL Lateral Incisor', quadrant: 'LL', type: 'incisor', arch: 'Lower' },
  { id: '33', fdi: '33', universal: '22', palmer: 'LL3', name: 'Mandibular Left Canine', shortName: 'LL Canine', quadrant: 'LL', type: 'canine', arch: 'Lower' },
  { id: '34', fdi: '34', universal: '21', palmer: 'LL4', name: 'Mandibular Left First Premolar', shortName: 'LL 1st Premolar', quadrant: 'LL', type: 'premolar', arch: 'Lower' },
  { id: '35', fdi: '35', universal: '20', palmer: 'LL5', name: 'Mandibular Left Second Premolar', shortName: 'LL 2nd Premolar', quadrant: 'LL', type: 'premolar', arch: 'Lower' },
  { id: '36', fdi: '36', universal: '19', palmer: 'LL6', name: 'Mandibular Left First Molar', shortName: 'LL 1st Molar', quadrant: 'LL', type: 'molar', arch: 'Lower' },
  { id: '37', fdi: '37', universal: '18', palmer: 'LL7', name: 'Mandibular Left Second Molar', shortName: 'LL 2nd Molar', quadrant: 'LL', type: 'molar', arch: 'Lower' },
  { id: '38', fdi: '38', universal: '17', palmer: 'LL8', name: 'Mandibular Left Third Molar (Wisdom)', shortName: 'LL 3rd Molar', quadrant: 'LL', type: 'molar', arch: 'Lower' },

  // ================= LOWER RIGHT QUADRANT (FDI 41 - 48) =================
  { id: '41', fdi: '41', universal: '25', palmer: 'LR1', name: 'Mandibular Right Central Incisor', shortName: 'LR Central Incisor', quadrant: 'LR', type: 'incisor', arch: 'Lower' },
  { id: '42', fdi: '42', universal: '26', palmer: 'LR2', name: 'Mandibular Right Lateral Incisor', shortName: 'LR Lateral Incisor', quadrant: 'LR', type: 'incisor', arch: 'Lower' },
  { id: '43', fdi: '43', universal: '27', palmer: 'LR3', name: 'Mandibular Right Canine', shortName: 'LR Canine', quadrant: 'LR', type: 'canine', arch: 'Lower' },
  { id: '44', fdi: '44', universal: '28', palmer: 'LR4', name: 'Mandibular Right First Premolar', shortName: 'LR 1st Premolar', quadrant: 'LR', type: 'premolar', arch: 'Lower' },
  { id: '45', fdi: '45', universal: '29', palmer: 'LR5', name: 'Mandibular Right Second Premolar', shortName: 'LR 2nd Premolar', quadrant: 'LR', type: 'premolar', arch: 'Lower' },
  { id: '46', fdi: '46', universal: '30', palmer: 'LR6', name: 'Mandibular Right First Molar', shortName: 'LR 1st Molar', quadrant: 'LR', type: 'molar', arch: 'Lower' },
  { id: '47', fdi: '47', universal: '31', palmer: 'LR7', name: 'Mandibular Right Second Molar', shortName: 'LR 2nd Molar', quadrant: 'LR', type: 'molar', arch: 'Lower' },
  { id: '48', fdi: '48', universal: '32', palmer: 'LR8', name: 'Mandibular Right Third Molar (Wisdom)', shortName: 'LR 3rd Molar', quadrant: 'LR', type: 'molar', arch: 'Lower' }
];

// Helper to look up a tooth object by its stored FDI ID
export const getToothById = (toothId) => {
  if (!toothId) return null;
  const idStr = String(toothId);
  // Match by FDI or Universal code just in case
  return TEETH_DEFS.find(t => t.id === idStr || t.fdi === idStr || t.universal === idStr);
};

// Formats the tooth label dynamically depending on selected system: 'FDI', 'Universal', or 'Palmer'
export const getToothLabel = (toothId, system = 'FDI') => {
  const tooth = getToothById(toothId);
  if (!tooth) return String(toothId);

  switch (system.toUpperCase()) {
    case 'UNIVERSAL':
      return `#${tooth.universal}`;
    case 'PALMER':
      return tooth.palmer;
    case 'FDI':
    default:
      return tooth.fdi;
  }
};

// Formats a rich display name, e.g. "Tooth #18 [FDI]" or "Tooth #1 [Universal]"
export const getToothDisplayName = (toothId, system = 'FDI') => {
  const tooth = getToothById(toothId);
  if (!tooth) return `Tooth ${toothId}`;

  const label = getToothLabel(toothId, system);
  return `${tooth.name} (${label})`;
};

// Layout mappings to ensure exact render orientation (Upper and Lower arches)
export const getUpperArchTeeth = () => {
  // Ordered from Right to Left: FDI 18 to 11, then FDI 21 to 28
  const rightQuadrant = TEETH_DEFS.filter(t => t.quadrant === 'UR').reverse(); // 18 down to 11
  const leftQuadrant = TEETH_DEFS.filter(t => t.quadrant === 'UL'); // 21 up to 28
  return [...rightQuadrant, ...leftQuadrant];
};

export const getLowerArchTeeth = () => {
  // Ordered from Right to Left visually to align with Upper Arch: FDI 48 down to 41, then 31 up to 38
  const rightQuadrant = TEETH_DEFS.filter(t => t.quadrant === 'LR').reverse(); // 48 down to 41
  const leftQuadrant = TEETH_DEFS.filter(t => t.quadrant === 'LL'); // 31 up to 38
  return [...rightQuadrant, ...leftQuadrant];
};
// Key dental clinical procedures for quick dropdown selection
export const STANDARD_DENTAL_PROCEDURES = [
  { name: 'Root Canal Treatment (RCT)', defaultCost: 4500, category: 'Endodontics' },
  { name: 'Composite Dental Filling', defaultCost: 1500, category: 'Restorative' },
  { name: 'Tooth Extraction (Simple)', defaultCost: 1200, category: 'Surgery' },
  { name: 'Surgical Tooth Extraction', defaultCost: 3500, category: 'Surgery' },
  { name: 'Dental Scaling & Polishing', defaultCost: 2000, category: 'Preventive' },
  { name: 'Ceramic Crown Placement', defaultCost: 8000, category: 'Prosthodontics' },
  { name: 'Zirconia Crown Placement', defaultCost: 12000, category: 'Prosthodontics' },
  { name: 'Orthodontic Braces Treatment', defaultCost: 45000, category: 'Orthodontics' },
  { name: 'Dental Implant Surgery', defaultCost: 35000, category: 'Implantology' },
  { name: 'Fluoride Treatment', defaultCost: 800, category: 'Preventive' },
  { name: 'Dental Veneer (Porcelain)', defaultCost: 15000, category: 'Cosmetic' },
  { name: 'Deep Periodontal Cleaning', defaultCost: 3000, category: 'Periodontics' }
];
