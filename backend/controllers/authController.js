export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Valid 10-digit phone number required' });
    }

    // Static OTP for now
    const otp = '123456';

    // In real implementation, send SMS here
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent successfully', phone });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    // Static OTP verification
    if (otp === '123456') {
      // Generate a simple token (in real app, use JWT)
      const token = `token_${phone}_${Date.now()}`;

      // Mock patient ID (in real app, find or create patient)
      const patientId = `patient_${phone}`;

      res.json({
        message: 'OTP verified successfully',
        token,
        user: { _id: patientId, phone, isVerified: true }
      });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
