import mongoose from 'mongoose';
import InvoiceTemplate from './Backend/models/InvoiceTemplate.js';
import dotenv from 'dotenv';

dotenv.config();

const checkTemplates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const count = await InvoiceTemplate.countDocuments();
    console.log(`Total templates in DB: ${count}`);
    
    const templates = await InvoiceTemplate.find().limit(5);
    console.log('Last 5 templates:');
    templates.forEach(t => {
      console.log(`- ID: ${t._id}, Name: ${t.name}, Org: ${t.organizationId}, Default: ${t.isDefault}, Layout: ${t.layoutType}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkTemplates();
