import ServiceRequest from '../models/ServiceRequest.js';

// Get service requests for a specific patient
export const getPatientRequests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const requests = await ServiceRequest.find({ patientId }).sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ message: 'Error fetching service requests', error: error.message });
  }
};

// Create a new service request
export const createRequest = async (req, res) => {
  try {
    const { patientId, organizationId, requestType, details, address, notes, totalAmount } = req.body;

    if (!patientId || !requestType) {
      return res.status(400).json({ message: 'patientId and requestType are required' });
    }

    const newRequest = new ServiceRequest({
      patientId,
      organizationId,
      requestType,
      details: details || {},
      address,
      notes,
      totalAmount: totalAmount || 0,
    });

    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ message: 'Error creating service request', error: error.message });
  }
};

// Update a service request
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true, runValidators: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating service request:', error);
    res.status(500).json({ message: 'Error updating service request', error: error.message });
  }
};

// Delete a service request
export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequest = await ServiceRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting service request:', error);
    res.status(500).json({ message: 'Error deleting service request', error: error.message });
  }
};
