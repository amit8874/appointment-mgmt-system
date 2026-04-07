import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

export const getRazorpayInstance = () => {
  if (!razorpayInstance && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } catch (error) {
      console.error('Razorpay initialization error:', error);
    }
  }
  return razorpayInstance;
};

/**
 * Create Razorpay order
 * @param {Number} amount - Amount in INR
 * @param {String} currency - Currency code (default: INR)
 * @param {Object} notes - Additional notes
 * @returns {Promise<Object>} Razorpay order
 */
export const createOrder = async (amount, currency = 'INR', notes = {}) => {
  try {
    const razorpay = getRazorpayInstance();
    
    if (!razorpay) {
      throw new Error('Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise, ensure integer
      currency,
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment signature
 * @param {String} orderId - Razorpay order ID
 * @param {String} paymentId - Razorpay payment ID
 * @param {String} signature - Razorpay signature
 * @returns {Boolean} True if signature is valid
 */
export const verifyPayment = (orderId, paymentId, signature) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured');
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('Verify payment error:', error);
    return false;
  }
};

/**
 * Capture payment (optional, usually handled by checkout)
 * @param {String} paymentId - Razorpay payment ID
 * @param {Number} amount - Amount in INR
 * @returns {Promise<Object>} Captured payment
 */
export const capturePayment = async (paymentId, amount) => {
  try {
    const razorpay = getRazorpayInstance();
    
    if (!razorpay) {
      throw new Error('Razorpay not configured');
    }

    const payment = await razorpay.payments.capture(paymentId, Math.round(amount * 100));
    return payment;
  } catch (error) {
    console.error('Capture payment error:', error);
    throw error;
  }
};
