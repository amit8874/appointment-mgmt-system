import axios from 'axios';
import fs from 'fs';
import path from 'path';

const getBase64Image = async (filePath) => {
  if (!filePath) return null;
  try {
    if (filePath.startsWith('http')) {
      console.log("Fetching S3 URL:", filePath.substring(0, 50) + "...");
      const response = await axios.get(filePath, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const ext = filePath.split('?')[0].split('.').pop() || 'png';
      return `data:image/${ext};base64,${buffer.toString('base64').substring(0, 50)}...`;
    }
  } catch (err) {
    console.error("Base64 conversion error:", err.message);
  }
  return null;
};

// We need an actual S3 URL from the DB. Let's connect to DB and get the latest PrescriptionTemplate.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const templateSchema = new mongoose.Schema({ headerImage: String, headerType: String, templateName: String });
    const PrescriptionTemplate = mongoose.model('PrescriptionTemplate', templateSchema, 'prescriptiontemplates');
    const templates = await PrescriptionTemplate.find({ headerType: 'custom' }).sort({ _id: -1 }).limit(1);
    if (templates.length > 0) {
      console.log("Found template:", templates[0].templateName);
      console.log("Header Image URL:", templates[0].headerImage);
      const b64 = await getBase64Image(templates[0].headerImage);
      console.log("Result:", b64);
    } else {
      console.log("No custom header templates found.");
    }
    process.exit(0);
  })
  .catch(err => console.error(err));
