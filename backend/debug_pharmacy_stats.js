import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pharmacy from './models/Pharmacy.js';
import Order from './models/Order.js';
import User from './models/User.js';

dotenv.config();

const debug = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hospital');
    console.log('Connected to DB');

    // Find all pharmacy users
    const pharmacyUsers = await User.find({ role: 'pharmacy' });
    console.log(`Found ${pharmacyUsers.length} pharmacy users`);

    for (const user of pharmacyUsers) {
      console.log(`\nChecking user: ${user.name} (${user._id})`);
      const pharmacy = await Pharmacy.findOne({ ownerId: user._id });
      if (!pharmacy) {
        console.log(' [!] NO PHARMACY RECORD FOUND');
        continue;
      }
      console.log(` Found pharmacy: ${pharmacy.name} (${pharmacy._id})`);

      const orders = await Order.find({ pharmacyId: pharmacy._id });
      console.log(` Found ${orders.length} orders`);
      
      orders.forEach((o, i) => {
          if (!o.status) console.log(`  Order ${i} (${o._id}) has NO STATUS`);
          if (!o.items) console.log(`  Order ${i} (${o._id}) has NO ITEMS`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

debug();
