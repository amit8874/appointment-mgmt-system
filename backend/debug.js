import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import Organization from './models/Organization.js';
import Subscription from './models/Subscription.js';

async function verifyDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const orgs = await Organization.find({ name: /Amit Maurya/i });
    if (orgs.length === 0) {
      console.log('No org found');
      process.exit(0);
    }
    
    for (const org of orgs) {
      console.log('--- Organization ---');
      console.log(`Name: ${org.name}`);
      console.log(`ID: ${org._id}`);
      console.log(`Status: ${org.status}`);
      console.log(`TrialActive: ${org.isTrialActive}`);
      console.log(`TrialEndDate: ${org.trialEndDate}`);
      
      const sub = await Subscription.findOne({ organizationId: org._id });
      if (sub) {
        console.log('--- Subscription ---');
        console.log(`Status: ${sub.status}`);
        console.log(`Plan: ${sub.plan}`);
        console.log(`TrialEndDate: ${sub.trialEndDate}`);
        console.log(`EndDate: ${sub.endDate}`);
      } else {
        console.log('No subscription found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

verifyDb();
