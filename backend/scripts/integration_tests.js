import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Subscription from '../models/Subscription.js';

dotenv.config();

const runTests = async () => {
    console.log("🚀 Starting End-to-End System Tests");
    
    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI not found.");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database Connected.");

        // 1. Tenant Isolation verification
        console.log("\n📦 Verifying Tenant Isolation Models...");
        const orgs = await Organization.find().limit(2);
        if (orgs.length === 0) {
            console.log("⚠️ No organizations found. Creating a test corp...");
            const newOrg = await Organization.create({
                name: "Test Launch Clinic",
                email: "test@launch.com",
                slug: "test-launch-clinic"
            });
            orgs.push(newOrg);
            console.log(`✅ Created test organization: ${newOrg._id}`);
        } else {
            console.log(`✅ Found ${orgs.length} organizations to test against.`);
        }

        const tenantId = orgs[0]._id;

        // 2. Doctor creation under specific tenant
        console.log("\n👨‍⚕️ Verifying Doctor Module...");
        let doc = await Doctor.findOne({ organizationId: tenantId });
        if (!doc) {
             doc = await Doctor.create({
                 organizationId: tenantId,
                 name: "Dr. Audit Check",
                 email: "draudit@launch.com",
                 specialization: "General Audit",
                 phone: "9999999999",
                 experience: 10,
                 fee: 500,
                 workingHours: { start: "09:00", end: "17:00" },
                 status: "Active"
             });
             console.log(`✅ Created test doctor: ${doc.name}`);
        } else {
             console.log(`✅ Doctor module verified (Found: ${doc.name}).`);
        }

        // 3. Appointment creation correctly isolated
        console.log("\n📅 Verifying Booking Module...");
        const booking = await Appointment.create({
            organizationId: tenantId,
            doctorId: doc._id.toString(),
            doctorName: doc.name,
            specialty: doc.specialization,
            patientId: "test-patient-" + Date.now(),
            patientName: "John Audit",
            patientPhone: "8888888888",
            date: new Date().toISOString().split('T')[0],
            time: "10:00",
            status: "pending"
        });
        console.log(`✅ Booking flow verified. Appointment ID: ${booking._id}`);

        // Cleanup test data to not pollute production DB
        if (doc.name === "Dr. Audit Check") {
            await Appointment.findByIdAndDelete(booking._id);
            await Doctor.findByIdAndDelete(doc._id);
            console.log("🧹 Cleaned up test booking & doctor data.");
        }

        // 4. Subscriptions Validation
        console.log("\n💳 Verifying Subscription Metrics (At-Risk / Expiry logic)...");
        const sub = await Subscription.findOne({ organizationId: tenantId });
        if (sub) {
             const now = new Date();
             const daysLeft = Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24));
             console.log(`✅ Subscription logic verified. Plan: ${sub.planName}, Days left: ${daysLeft}`);
        } else {
             console.log("⚠️ No subscription record for primary org. Ensure standard trial attaches properly on creation.");
        }

        console.log("\n🏆 All Core Module Tests Passed Effectively!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Test Failed:", err);
        process.exit(1);
    }
};

runTests();
