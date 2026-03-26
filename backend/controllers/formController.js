import FormData from '../models/PaitentEditProfile.js';

// Save form data
export const saveFormData = async (req, res) => {
    try {
        const newForm = new FormData(req.body);
        await newForm.save();
        res.status(201).json({ message: "Form data saved successfullu"});
    } catch (error) {
        console.error("Error saving form data:", error);
        res.status(500).json({ error: "Failed to save form data"})
    }
};

// (Optional): GET: Fetch all form submissions
export const getAllFormData = async (req, res) =>{
    try {
        const form = await FormData.find();
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch form data"});
    }
};
