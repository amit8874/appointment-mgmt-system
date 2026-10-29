/**
 * Safely formats patient full name avoiding double titles (e.g., "MR. MR. Amit Maurya", "MR. MISS Sneha")
 * 
 * @param {string} designation - e.g. "MR.", "MRS.", "DR.", "MS.", "MISS", "SHRI", "SMT"
 * @param {string} firstName - e.g. "Amit" or "MR. Amit"
 * @param {string} lastName - e.g. "Maurya"
 * @returns {string} - Formatted full name e.g. "MR. Amit Maurya"
 */
export const formatPatientFullName = (designation = '', firstName = '', lastName = '') => {
  let des = (designation || '').trim();
  let first = (firstName || '').trim();
  let last = (lastName || '').trim();

  // Known titles / salutations
  const titleRegex = /^(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?$/i;

  // Split firstName and extract any leading title
  const firstWords = first.split(/\s+/).filter(Boolean);
  let embeddedTitle = '';
  while (firstWords.length > 0 && titleRegex.test(firstWords[0])) {
    if (!embeddedTitle) {
      embeddedTitle = firstWords[0].replace(/\./g, '').toUpperCase();
    }
    firstWords.shift();
  }
  first = firstWords.join(' ');

  // Use designation if provided, else use embedded title from first name
  let effectiveTitle = des ? des.replace(/\./g, '').toUpperCase() : embeddedTitle;
  
  // Format title e.g. "MR." or "MISS"
  let titleStr = '';
  if (effectiveTitle) {
    titleStr = effectiveTitle === 'MISS' ? 'MISS' : `${effectiveTitle}.`;
  }

  let combined = `${titleStr ? titleStr + ' ' : ''}${first} ${last}`.trim();

  // Clean consecutive duplicate or mixed titles like "MR. MR. Amit" or "MR. MISS Sneha"
  const multiTitleRegex = /\b(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?(?:\s+|\.+)+(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?/gi;
  while (multiTitleRegex.test(combined)) {
    combined = combined.replace(multiTitleRegex, (match, t1, t2) => {
      // Prefer t2 if it's more specific (e.g. MISS over MR default)
      const chosen = (t1.toUpperCase() === 'MR' && t2.toUpperCase() !== 'MR') ? t2 : t1;
      const canonical = chosen.toUpperCase();
      return canonical === 'MISS' ? 'MISS' : (canonical.endsWith('.') ? canonical : canonical + '.');
    });
  }

  // Clean extra consecutive spaces
  return combined.replace(/\s{2,}/g, ' ').trim();
};

/**
 * Cleans an existing full name string from duplicate titles or malformed salutations.
 * 
 * @param {string} fullName 
 * @returns {string}
 */
export const cleanPatientName = (fullName = '') => {
  if (!fullName) return '';
  let str = fullName.toString().trim();
  
  const multiTitleRegex = /\b(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?(?:\s+|\.+)+(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?/gi;
  while (multiTitleRegex.test(str)) {
    str = str.replace(multiTitleRegex, (match, t1, t2) => {
      const chosen = (t1.toUpperCase() === 'MR' && t2.toUpperCase() !== 'MR') ? t2 : t1;
      const canonical = chosen.toUpperCase();
      return canonical === 'MISS' ? 'MISS' : (canonical.endsWith('.') ? canonical : canonical + '.');
    });
  }

  return str.replace(/\s{2,}/g, ' ').trim();
};
