import ContactMessage from '../models/ContactMessage.js';

export const submitContactForm = async (req, res) => {
  try {
    const { fullName, email, subject, organization, message } = req.body;
    
    if (!fullName || !email || !message) {
      return res.status(400).json({ message: 'Full name, email and message are required' });
    }

    const newMessage = new ContactMessage({ 
      fullName, 
      email, 
      subject, 
      organization, 
      message 
    });
    
    await newMessage.save();
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

export const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await ContactMessage.findByIdAndUpdate(id, { status });
    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ message: 'Error updating status' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await ContactMessage.findByIdAndDelete(id);
    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
};
