/**
 * Safely formats patient full name avoiding double titles (e.g., "MR. MR. Amit Maurya")
 * 
 * @param {string} designation - e.g. "MR.", "MRS.", "DR.", "MS.", "MISS"
 * @param {string} firstName - e.g. "Amit" or "MR. Amit"
 * @param {string} lastName - e.g. "Maurya"
 * @returns {string} - Formatted full name e.g. "MR. Amit Maurya"
 */
export const formatPatientFullName = (designation = '', firstName = '', lastName = '') => {
  let des = (designation || '').trim();
  let first = (firstName || '').trim();
  let last = (lastName || '').trim();

  // Common titles to check
  const titleRegex = /^(MR|MRS|MS|MISS|DR|PROF)\.?$/i;

  // If firstName already begins with a title, e.g. "MR. Amit" or "Dr. John"
  const firstWords = first.split(/\s+/);
  if (firstWords.length > 0 && titleRegex.test(firstWords[0])) {
    // If designation matches first word title or if first name already has a title,
    // clear designation so we don't prepend it twice
    des = '';
  }

  let combined = `${des ? des + ' ' : ''}${first} ${last}`.trim();

  // Deduplicate consecutive repeated titles like "MR. MR. Amit", "MR MR Amit", "DR. DR. Smith"
  combined = combined.replace(/\b(MR|MRS|MS|MISS|DR|PROF)\.?(?:\s+|\.+)+(MR|MRS|MS|MISS|DR|PROF)\.?/gi, (match, t1) => {
    const canonical = t1.toUpperCase();
    return canonical.endsWith('.') ? canonical : canonical + '.';
  });

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
  
  // Deduplicate repeated titles like "MR. MR. Amit", "MR MR. Amit", "MR. MR Amit"
  str = str.replace(/\b(MR|MRS|MS|MISS|DR|PROF)\.?(?:\s+|\.+)+(MR|MRS|MS|MISS|DR|PROF)\.?/gi, (match, t1) => {
    const canonical = t1.toUpperCase();
    return canonical.endsWith('.') ? canonical : canonical + '.';
  });

  return str.replace(/\s{2,}/g, ' ').trim();
};
