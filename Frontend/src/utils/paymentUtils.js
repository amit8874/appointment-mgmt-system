/**
 * Utility for Razorpay payment pre-fill and validation
 */

/**
 * Sanitizes a mobile number for Razorpay (strictly 10-digit numeric)
 * Removes spaces, +91, and any non-numeric characters.
 */
export const sanitizeMobileNumber = (mobile) => {
  if (!mobile) return '';
  
  // Remove all non-numeric characters
  let cleaned = mobile.toString().replace(/\D/g, '');
  
  // If it starts with 91 and is 12 digits, remove the first 2 (91)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  
  // Take only the last 10 digits to be safe
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }
  
  return cleaned;
};

/**
 * Validates if a string is a valid email
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Resolves the best available customer details for Razorpay prefill
 * Fallback Priority:
 * - name: user.name -> organization.ownerName -> organization.name
 * - email: user.email -> organization.email
 * - contact: user.mobile -> organization.phone
 */
export const getPaymentPrefillDetails = (user, organization) => {
  const prefill = {
    name: '',
    email: '',
    contact: ''
  };

  if (!user && !organization) return prefill;

  // 1. Resolve Name
  prefill.name = (user?.name || organization?.branding?.clinicName || organization?.name || '').trim();

  // 2. Resolve Email
  prefill.email = (user?.email || organization?.email || '').trim();

  // 3. Resolve Contact (Sanitized)
  const rawContact = user?.mobile || organization?.phone || '';
  prefill.contact = sanitizeMobileNumber(rawContact);

  return prefill;
};

/**
 * Validates prefill details and returns an error message if invalid
 */
export const validatePaymentDetails = (details) => {
  if (!details.name) {
    return "Please update your name in your profile before continuing with payment.";
  }
  
  if (!details.email || !isValidEmail(details.email)) {
    return "Please provide a valid email address in your profile before continuing with payment.";
  }
  
  if (!details.contact || details.contact.length !== 10) {
    return "Please update your 10-digit mobile number in your profile before continuing with payment.";
  }
  
  return null; // All valid
};
