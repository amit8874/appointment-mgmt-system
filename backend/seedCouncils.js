import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Council from './models/Council.js';

dotenv.config();

const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cms';

const councils = [
  "Andhra Pradesh Medical Council",
  "Arunachal Pradesh Medical Council",
  "Assam Medical Council",
  "Bihar Medical Council",
  "Chhattisgarh Medical Council",
  "Delhi Medical Council",
  "Goa Medical Council",
  "Gujarat Medical Council",
  "Haryana Medical Council",
  "Himachal Pradesh Medical Council",
  "Jammu & Kashmir Medical Council",
  "Jharkhand Medical Council",
  "Karnataka Medical Council",
  "Madhya Pradesh Medical Council",
  "Maharashtra Medical Council",
  "Erstwhile Medical Council of India (now replaced by NMC)",
  "Mizoram Medical Council",
  "Nagaland Medical Council",
  "Orissa Council of Medical Registration",
  "Punjab Medical Council",
  "Rajasthan Medical Council",
  "Sikkim Medical Council",
  "Tamil Nadu Medical Council",
  "Travancore Medical Council",
  "Uttar Pradesh Medical Council",
  "Uttaranchal Medical Council (now Uttarakhand Medical Council)",
  "West Bengal Medical Council",
  "Tripura Medical Council",
  "Telangana Medical Council"
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB...', dbURI);
    await mongoose.connect(dbURI);
    console.log('Connected.');

    let updatedCount = 0;
    let insertedCount = 0;

    for (const name of councils) {
      const existing = await Council.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (existing) {
        existing.name = name;
        await existing.save();
        updatedCount++;
      } else {
        await Council.create({ name });
        insertedCount++;
      }
    }

    console.log(`\nDONE! Updated: ${updatedCount}, Inserted: ${insertedCount}`);
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seedData();
