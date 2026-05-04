import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendClinicRegistrationNotification, sendPharmacyRegistrationNotification } from '../services/emailService.js';

// Load .env from the same directory
dotenv.config();

async function testNotifications() {
    console.log('--- Starting Registration Notification Test ---');
    console.log('Target Email:', process.env.EMAIL_USER || 'amitmaurya3276@gmail.com');
    console.log('Email Pass Configured:', process.env.EMAIL_PASS ? 'YES' : 'NO');
    
    const dummyOrg = {
        name: 'Test Test Clinic',
        email: 'test@clinic.com',
        phone: '1234567890',
        subdomain: 'test-clinic',
        address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State'
        }
    };

    const dummyOwner = {
        name: 'Test Owner',
        email: 'owner@test.com',
        plainPassword: 'TestPassword123'
    };

    console.log('\n1. Testing Clinic Notification Logic...');
    try {
        const result = await sendClinicRegistrationNotification(dummyOrg, dummyOwner);
        if (result) {
            console.log('✅ Clinic notification logic executed successfully.');
        } else {
            console.log('❌ Clinic notification logic failed.');
        }
    } catch (err) {
        console.error('💥 Error in Clinic Notification:', err.message);
    }

    const dummyPharmacy = {
        name: 'Test Pharmacy',
        email: 'pharmacy@test.com',
        phone: '9876543210',
        ownerName: 'Pharmacy Manager',
        address: {
            street: '456 Pharma Rd',
            city: 'Pharma City',
            state: 'Pharma State'
        }
    };

    console.log('\n2. Testing Pharmacy Notification Logic...');
    try {
        const result = await sendPharmacyRegistrationNotification(dummyPharmacy);
        if (result) {
            console.log('✅ Pharmacy notification logic executed successfully.');
        } else {
            console.log('❌ Pharmacy notification logic failed.');
        }
    } catch (err) {
        console.error('💥 Error in Pharmacy Notification:', err.message);
    }

    console.log('\n--- Test Complete ---');
}

testNotifications();
