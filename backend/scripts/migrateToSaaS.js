/**
 * Database Migration Script
 * Migrates existing single-tenant data to multi-tenant SaaS architecture
 * 
 * Usage: node backend/scripts/migrateToSaaS.js
 * 
 * IMPORTANT: Backup your database before running this script!
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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management-saas';

async function migrateToSaaS() {
  try {
    console.log('🚀 Starting SaaS Migration...');
    console.log('⚠️  WARNING: This will modify your database. Ensure you have a backup!');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Create default organization for existing data
    console.log('\n📋 Step 1: Creating default organization...');
    
    let defaultOrg = await Organization.findOne({ slug: 'default-clinic' });
    
    if (!defaultOrg) {
      // Create a default superadmin user first
      const defaultSuperAdmin = await User.findOne({ role: 'superadmin' });
      
      if (!defaultSuperAdmin) {
        console.log('Creating default superadmin user...');
        
        // Pass plain password - the User model's pre-save hook will hash it
        const superAdmin = new User({
          name: 'Super Admin',
          email: 'superadmin@clinicms.com',
          password: 'SuperAdmin@123', // Plain password - will be hashed by pre-save hook
          role: 'superadmin',
        });
        await superAdmin.save();
        console.log('✅ Created default superadmin user');
      }

      const ownerId = defaultSuperAdmin?._id || (await User.findOne({ role: 'superadmin' }))._id;

      defaultOrg = new Organization({
        name: 'Default Clinic',
        email: 'default@clinic.com',
        slug: 'default-clinic',
        subdomain: 'default',
        ownerId: ownerId,
        status: 'active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      await defaultOrg.save();
      console.log('✅ Created default organization:', defaultOrg._id);
    } else {
      console.log('✅ Default organization already exists');
    }

    const organizationId = defaultOrg._id;

    // Step 2: Create default subscription
    console.log('\n📋 Step 2: Creating default subscription...');
    let defaultSubscription = await Subscription.findOne({ organizationId });
    
    if (!defaultSubscription) {
      defaultSubscription = new Subscription({
        organizationId,
        plan: 'enterprise', // Give default org enterprise plan
        planName: 'Enterprise',
        billingCycle: 'monthly',
        amount: 0, // Free for default org
        status: 'active',
        startDate: new Date(),
        limits: Subscription.getPlanLimits('enterprise'),
      });
      
      // Calculate end date
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      defaultSubscription.endDate = endDate;
      defaultSubscription.nextBillingDate = endDate;
      
      await defaultSubscription.save();
      defaultOrg.subscriptionId = defaultSubscription._id;
      await defaultOrg.save();
      console.log('✅ Created default subscription');
    } else {
      console.log('✅ Default subscription already exists');
    }

    // Step 3: Update Users
    console.log('\n📋 Step 3: Migrating users...');
    const usersWithoutOrg = await User.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
      role: { $ne: 'superadmin' },
    });

    let updatedUsers = 0;
    for (const user of usersWithoutOrg) {
      user.organizationId = organizationId;
      await user.save();
      updatedUsers++;
    }
    console.log(`✅ Updated ${updatedUsers} users`);

    // Step 4: Update Doctors
    console.log('\n📋 Step 4: Migrating doctors...');
    const doctorsWithoutOrg = await Doctor.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedDoctors = 0;
    for (const doctor of doctorsWithoutOrg) {
      doctor.organizationId = organizationId;
      await doctor.save();
      updatedDoctors++;
    }
    console.log(`✅ Updated ${updatedDoctors} doctors`);

    // Step 5: Update Receptionists
    console.log('\n📋 Step 5: Migrating receptionists...');
    const receptionistsWithoutOrg = await Receptionist.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedReceptionists = 0;
    for (const receptionist of receptionistsWithoutOrg) {
      receptionist.organizationId = organizationId;
      await receptionist.save();
      updatedReceptionists++;
    }
    console.log(`✅ Updated ${updatedReceptionists} receptionists`);

    // Step 6: Update Appointments
    console.log('\n📋 Step 6: Migrating appointments...');
    const appointmentsWithoutOrg = await Appointment.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedAppointments = 0;
    for (const appointment of appointmentsWithoutOrg) {
      appointment.organizationId = organizationId;
      await appointment.save();
      updatedAppointments++;
    }
    console.log(`✅ Updated ${updatedAppointments} appointments`);

    // Step 7: Update Pending Appointments
    console.log('\n📋 Step 7: Migrating pending appointments...');
    const pendingWithoutOrg = await PendingAppointment.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedPending = 0;
    for (const appointment of pendingWithoutOrg) {
      appointment.organizationId = organizationId;
      await appointment.save();
      updatedPending++;
    }
    console.log(`✅ Updated ${updatedPending} pending appointments`);

    // Step 8: Update Confirmed Appointments
    console.log('\n📋 Step 8: Migrating confirmed appointments...');
    const confirmedWithoutOrg = await ConfirmedAppointment.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedConfirmed = 0;
    for (const appointment of confirmedWithoutOrg) {
      appointment.organizationId = organizationId;
      await appointment.save();
      updatedConfirmed++;
    }
    console.log(`✅ Updated ${updatedConfirmed} confirmed appointments`);

    // Step 9: Update Cancelled Appointments
    console.log('\n📋 Step 9: Migrating cancelled appointments...');
    const cancelledWithoutOrg = await CancelledAppointment.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedCancelled = 0;
    for (const appointment of cancelledWithoutOrg) {
      appointment.organizationId = organizationId;
      await appointment.save();
      updatedCancelled++;
    }
    console.log(`✅ Updated ${updatedCancelled} cancelled appointments`);

    // Step 10: Update Billing
    console.log('\n📋 Step 10: Migrating billing records...');
    const billingWithoutOrg = await Billing.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedBilling = 0;
    for (const bill of billingWithoutOrg) {
      bill.organizationId = organizationId;
      await bill.save();
      updatedBilling++;
    }
    console.log(`✅ Updated ${updatedBilling} billing records`);

    // Step 11: Update Notifications
    console.log('\n📋 Step 11: Migrating notifications...');
    const notificationsWithoutOrg = await Notification.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    });

    let updatedNotifications = 0;
    for (const notification of notificationsWithoutOrg) {
      notification.organizationId = organizationId;
      await notification.save();
      updatedNotifications++;
    }
    console.log(`✅ Updated ${updatedNotifications} notifications`);

    // Step 12: Update unique indexes
    console.log('\n📋 Step 12: Updating indexes...');
    // Note: MongoDB will handle index updates automatically
    // But we should ensure compound indexes are created
    console.log('✅ Indexes will be created automatically on next server start');

    // Summary
    console.log('\n✨ Migration Summary:');
    console.log(`   - Default Organization: ${defaultOrg.name} (${defaultOrg._id})`);
    console.log(`   - Users migrated: ${updatedUsers}`);
    console.log(`   - Doctors migrated: ${updatedDoctors}`);
    console.log(`   - Receptionists migrated: ${updatedReceptionists}`);
    console.log(`   - Appointments migrated: ${updatedAppointments}`);
    console.log(`   - Pending appointments migrated: ${updatedPending}`);
    console.log(`   - Confirmed appointments migrated: ${updatedConfirmed}`);
    console.log(`   - Cancelled appointments migrated: ${updatedCancelled}`);
    console.log(`   - Billing records migrated: ${updatedBilling}`);
    console.log(`   - Notifications migrated: ${updatedNotifications}`);
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Update your frontend to use tenant detection');
    console.log('   2. Test the application with the default organization');
    console.log('   3. Register new organizations to test multi-tenancy');
    console.log('   4. Update superadmin password: SuperAdmin@123');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateToSaaS()
  .then(() => {
    console.log('\n🎉 Migration script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
