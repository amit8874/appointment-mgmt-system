/**
 * Sanitizes a phone number to E.164 format for WhatsApp Cloud API.
 * Removes +, spaces, and non-numeric characters.
 * Ensures the number starts with a country code (defaults to 91 if 10 digits).
 * 
 * @param {string} phone - The raw phone number string.
 * @returns {string} - The sanitized phone number.
 */
export const sanitizePhone = (phone) => {
  if (!phone) return "";

  // Remove all non-numeric characters
  let cleanNumber = phone.replace(/\D/g, "");

  // If it's a 10-digit number, prepend 91 (India)
  if (cleanNumber.length === 10) {
    cleanNumber = "91" + cleanNumber;
  }

  return cleanNumber;
};
