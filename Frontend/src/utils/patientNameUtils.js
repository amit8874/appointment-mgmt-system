/**
 * Utility to parse, clean and extract pure patient full name and designation.
 * Prevents titles from appearing inside the 'fullName' text input
 * and prevents duplicate designations (e.g. "MR. MR. Amit Maurya").
 */

export const extractCleanNameAndDesignation = (patient = {}) => {
  if (!patient) return { cleanFullName: '', designation: 'MR.' };

  let rawName = '';
  let designation = '';
  let gender = '';

  if (typeof patient === 'string') {
    rawName = patient.trim();
  } else if (typeof patient === 'object') {
    rawName = (patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`).trim();
    designation = (patient.designation || '').trim();
    gender = (patient.gender || '').trim();
  }

  // Regex matching leading title / salutation (case-insensitive, optional period, followed by whitespace)
  const titleRegex = /^(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?\s+/i;
  
  let cleanName = rawName;
  let extractedTitle = '';

  // Repeatedly strip all leading titles (e.g., "MR. MR. Amit Maurya" -> "Amit Maurya")
  while (titleRegex.test(cleanName)) {
    const match = cleanName.match(titleRegex);
    if (match && !extractedTitle) {
      extractedTitle = match[1].toUpperCase();
    }
    cleanName = cleanName.replace(titleRegex, '').trim();
  }

  // If cleanName is empty or equals only title, fallback to patient.firstName / patient.lastName if available
  if (!cleanName && typeof patient === 'object') {
    let fallback = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    while (titleRegex.test(fallback)) {
      fallback = fallback.replace(titleRegex, '').trim();
    }
    cleanName = fallback;
  }

  // Determine effective title
  let effectiveTitle = (designation || extractedTitle || '').toUpperCase().replace(/\./g, '');

  // Map to one of the form's options: 'MR.', 'MS.', 'MRS.', 'MISS', 'SHRI', 'SMT.'
  let finalDesignation = 'MR.';
  if (effectiveTitle === 'MISS') {
    finalDesignation = 'MISS';
  } else if (['MS', 'MRS', 'SHRI', 'SMT'].includes(effectiveTitle)) {
    finalDesignation = `${effectiveTitle}.`;
  } else if (effectiveTitle === 'DR' || effectiveTitle === 'PROF' || effectiveTitle === 'MR') {
    finalDesignation = 'MR.';
  } else if (gender) {
    const g = gender.toLowerCase();
    if (g === 'female') finalDesignation = 'MS.';
  }

  return {
    cleanFullName: cleanName,
    designation: finalDesignation
  };
};
