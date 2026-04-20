import mongoose from 'mongoose';
import User from './backend/models/User.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ mobile: '8874614138' });
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
