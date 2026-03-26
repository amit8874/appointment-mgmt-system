/**
 * Complete Database Setup Script
 * Sets up the database for SaaS multi-tenant architecture
 * 
 * Usage: node backend/scripts/setupDatabase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Receptionist from '../models/Receptionist.js';
import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital';

async function setupDatabase() {
  try {
    console.log('🚀 Starting Complete Database Setup...');
    console.log('='.repeat(60));
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));
    console.log('');

    // Step 1: Fix Mobile Index
    console.log('📋 Step 1: Fixing Mobile Index...');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    try {
      const indexes = await usersCollection.indexes();
      const hasOldMobileIndex = indexes.some(idx => idx.name === 'mobile_1' && !idx.key.organizationId);
      
      if (hasOldMobileIndex) {
        await usersCollection.dropIndex('mobile_1');
        console.log('   ✅ Dropped old mobile_1 index');
      } else {
        console.log('   ℹ️  Old mobile_1 index not found (already fixed)');
      }
      
      // Ensure compound index exists
      try {
        await usersCollection.createIndex(
          { mobile: 1, organizationId: 1 },
          { unique: true, sparse: true, name: 'mobile_1_organizationId_1' }
        );
        console.log('   ✅ Compound index (mobile + organizationId) verified');
      } catch (error) {
        if (error.code === 85) {
          console.log('   ℹ️  Compound index already exists');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.log('   ⚠️  Index fix warning:', error.message);
    }
    console.log('');

    // Step 2: Create/Verify Super Admin
    console.log('📋 Step 2: Setting up Super Admin...');
    let superAdmin = await User.findOne({ role: 'superadmin' });
    
    if (!superAdmin) {
      console.log('   Creating default superadmin user...');
      
      // Pass plain password - the User model's pre-save hook will hash it
      superAdmin = new User({
        name: 'Super Admin',
        email: 'superadmin@clinicms.com',
        password: 'SuperAdmin@123', // Plain password - will be hashed by pre-save hook
        role: 'superadmin',
      });
      await superAdmin.save();
      console.log('   ✅ Created superadmin user');
      console.log('   📧 Email: superadmin@clinicms.com');
      console.log('   🔑 Password: SuperAdmin@123');
      console.log('   ⚠️  IMPORTANT: Change this password immediately!');
    } else {
      console.log('   ✅ Superadmin user already exists');
      console.log('   📧 Email:', superAdmin.email);
    }
    console.log('');

    // Step 3: Create/Verify Default Organization
    console.log('📋 Step 3: Setting up Default Organization...');
    let defaultOrg = await Organization.findOne({ slug: 'default-clinic' });
    
    if (!defaultOrg) {
      console.log('   Creating default organization...');
      defaultOrg = new Organization({
        name: 'Default Clinic',
        email: 'default@clinic.com',
        slug: 'default-clinic',
        subdomain: 'default',
        ownerId: superAdmin._id,
        status: 'active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      await defaultOrg.save();
      console.log('   ✅ Created default organization');
    } else {
      console.log('   ✅ Default organization already exists');
    }
    console.log('   📝 Organization ID:', defaultOrg._id);
    console.log('');

    // Step 4: Create/Verify Default Subscription
    console.log('📋 Step 4: Setting up Default Subscription...');
    let defaultSubscription = await Subscription.findOne({ organizationId: defaultOrg._id });
    
    if (!defaultSubscription) {
      console.log('   Creating default subscription...');
      defaultSubscription = new Subscription({
        organizationId: defaultOrg._id,
        plan: 'enterprise',
        planName: 'Enterprise',
        billingCycle: 'monthly',
        amount: 0,
        status: 'active',
        startDate: new Date(),
        limits: Subscription.getPlanLimits('enterprise'),
      });
      
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      defaultSubscription.endDate = endDate;
      defaultSubscription.nextBillingDate = endDate;
      
      await defaultSubscription.save();
      defaultOrg.subscriptionId = defaultSubscription._id;
      await defaultOrg.save();
      console.log('   ✅ Created default subscription (Enterprise plan)');
    } else {
      console.log('   ✅ Default subscription already exists');
    }
    console.log('');

    // Step 5: Migrate Existing Data
    console.log('📋 Step 5: Migrating Existing Data...');
    
    const migrationStats = {
      users: 0,
      doctors: 0,
      receptionists: 0,
      appointments: 0,
      pendingAppointments: 0,
      confirmedAppointments: 0,
      cancelledAppointments: 0,
      billing: 0,
      notifications: 0,
    };

    // Migrate Users
    const usersWithoutOrg = await User.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
        role: { $ne: 'superadmin' },
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.users = usersWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.users} users`);

    // Migrate Doctors
    const doctorsWithoutOrg = await Doctor.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.doctors = doctorsWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.doctors} doctors`);

    // Migrate Receptionists
    const receptionistsWithoutOrg = await Receptionist.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.receptionists = receptionistsWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.receptionists} receptionists`);

    // Migrate Appointments
    const appointmentsWithoutOrg = await Appointment.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.appointments = appointmentsWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.appointments} appointments`);

    // Migrate Pending Appointments
    const pendingWithoutOrg = await PendingAppointment.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.pendingAppointments = pendingWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.pendingAppointments} pending appointments`);

    // Migrate Confirmed Appointments
    const confirmedWithoutOrg = await ConfirmedAppointment.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.confirmedAppointments = confirmedWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.confirmedAppointments} confirmed appointments`);

    // Migrate Cancelled Appointments
    const cancelledWithoutOrg = await CancelledAppointment.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.cancelledAppointments = cancelledWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.cancelledAppointments} cancelled appointments`);

    // Migrate Billing
    const billingWithoutOrg = await Billing.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.billing = billingWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.billing} billing records`);

    // Migrate Notifications
    const notificationsWithoutOrg = await Notification.updateMany(
      {
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null },
        ],
      },
      { $set: { organizationId: defaultOrg._id } }
    );
    migrationStats.notifications = notificationsWithoutOrg.modifiedCount;
    console.log(`   ✅ Migrated ${migrationStats.notifications} notifications`);
    console.log('');

    // Step 6: Verify Indexes
    console.log('📋 Step 6: Verifying Database Indexes...');
    const collections = [
      { name: 'users', model: User },
      { name: 'organizations', model: Organization },
      { name: 'subscriptions', model: Subscription },
      { name: 'doctors', model: Doctor },
      { name: 'receptionists', model: Receptionist },
      { name: 'appointments', model: Appointment },
    ];

    for (const collection of collections) {
      try {
        const indexes = await db.collection(collection.name).indexes();
        console.log(`   ✅ ${collection.name}: ${indexes.length} indexes`);
      } catch (error) {
        console.log(`   ⚠️  ${collection.name}: Error checking indexes`);
      }
    }
    console.log('');

    // Step 7: Database Statistics
    console.log('📋 Step 7: Database Statistics...');
    const stats = {
      organizations: await Organization.countDocuments(),
      subscriptions: await Subscription.countDocuments(),
      users: await User.countDocuments(),
      doctors: await Doctor.countDocuments(),
      receptionists: await Receptionist.countDocuments(),
      appointments: await Appointment.countDocuments(),
      pendingAppointments: await PendingAppointment.countDocuments(),
      confirmedAppointments: await ConfirmedAppointment.countDocuments(),
      cancelledAppointments: await CancelledAppointment.countDocuments(),
      billing: await Billing.countDocuments(),
      notifications: await Notification.countDocuments(),
    };

    console.log('   📊 Current Database Counts:');
    console.log(`      Organizations: ${stats.organizations}`);
    console.log(`      Subscriptions: ${stats.subscriptions}`);
    console.log(`      Users: ${stats.users}`);
    console.log(`      Doctors: ${stats.doctors}`);
    console.log(`      Receptionists: ${stats.receptionists}`);
    console.log(`      Appointments: ${stats.appointments}`);
    console.log(`      Pending Appointments: ${stats.pendingAppointments}`);
    console.log(`      Confirmed Appointments: ${stats.confirmedAppointments}`);
    console.log(`      Cancelled Appointments: ${stats.cancelledAppointments}`);
    console.log(`      Billing Records: ${stats.billing}`);
    console.log(`      Notifications: ${stats.notifications}`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✨ Database Setup Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 Summary:');
    console.log(`   ✅ Super Admin: ${superAdmin.email}`);
    console.log(`   ✅ Default Organization: ${defaultOrg.name} (${defaultOrg.slug})`);
    console.log(`   ✅ Default Subscription: ${defaultSubscription.planName} plan`);
    console.log('');
    console.log('📊 Migration Results:');
    console.log(`   - Users migrated: ${migrationStats.users}`);
    console.log(`   - Doctors migrated: ${migrationStats.doctors}`);
    console.log(`   - Receptionists migrated: ${migrationStats.receptionists}`);
    console.log(`   - Appointments migrated: ${migrationStats.appointments}`);
    console.log(`   - Billing records migrated: ${migrationStats.billing}`);
    console.log(`   - Notifications migrated: ${migrationStats.notifications}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Start your backend server: npm run dev');
    console.log('   2. Start your frontend: npm run dev');
    console.log('   3. Login as superadmin to test');
    console.log('   4. Register a new organization to test multi-tenancy');
    console.log('   5. ⚠️  Change superadmin password immediately!');
    console.log('');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run setup
setupDatabase()
  .then(() => {
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });
