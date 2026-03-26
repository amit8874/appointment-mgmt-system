import React from 'react';
import { CheckCircle, CreditCard, Banknote, Wallet, Zap, Menu } from 'lucide-react';

// --- Mock Data and Components ---


// Mock Payment Icon Component (e.g., Visa, RuPay)
const PaymentIcon = ({ name, color }) => (
  <div className={`p-2 w-16 h-10 flex items-center justify-center rounded-lg shadow-md font-bold text-xs ${color} text-white`}>
    {name}
  </div>
);

// Mock Bank Logo Component (e.g., SBI, HDFC)
const BankLogo = ({ name, bgColor }) => (
  <div className={`p-2 w-20 h-10 flex items-center justify-center rounded-md text-sm font-semibold text-white shadow-inner ${bgColor}`}>
    {name}
  </div>
);

// A reusable list item component for features
const FeatureListItem = ({ children, isHeader = false, icon: Icon, iconClass = "text-yellow-600" }) => (
  <div className="flex items-start mb-3">
    {Icon && (
      <Icon className={`h-5 w-5 mr-3 mt-1 flex-shrink-0 ${iconClass}`} />
    )}
    <p className={isHeader ? "text-lg font-semibold text-gray-700" : "text-gray-600"}>
      {children}
    </p>
  </div>
);

// Illustration SVG (Simplified version of the phone/card graphic)
const PaymentIllustration = () => (
  <div className="relative w-full max-w-lg mx-auto">
    {/* Background Curve/Swoosh */}
    <div className="absolute inset-0 -top-12 -right-12 h-full w-full bg-white opacity-80 rounded-full blur-3xl transform rotate-12"></div>

    {/* Main Illustration Container */}
    <div className="relative p-8 pt-16">
      {/* Mock Phone */}
      <div className="w-36 h-64 bg-gray-900 rounded-2xl shadow-2xl mx-auto border-4 border-gray-700 relative z-10">
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded-full"></div>
        <div className="p-2 pt-5">
          <svg className="w-full h-full text-red-500" viewBox="0 0 100 150">
            <rect x="10" y="10" width="80" height="130" fill="#f0f0f0" rx="5"></rect>
            <rect x="20" y="20" width="60" height="10" fill="#e5e7eb"></rect>
            <rect x="20" y="35" width="40" height="8" fill="#e5e7eb"></rect>
            <rect x="20" y="50" width="60" height="70" fill="#fee2e2"></rect>
            <circle cx="50" cy="135" r="3" fill="#6b7280"></circle>
            {/* Shopping Cart Icon */}
            <path d="M45 55 L55 55 L60 65 L40 65 Z M40 65 L40 75 L60 75 L60 65" fill="#f87171"></path>
          </svg>
        </div>
      </div>

      {/* Mock Credit Cards (Floating around the phone) */}
      <div className="absolute top-10 right-4 w-28 h-16 bg-red-600 rounded-lg shadow-xl transform rotate-12 p-2 text-xs text-white z-20">
        <CreditCard className="w-4 h-4" />
        <p className="mt-1 font-mono">**** 7890</p>
      </div>

      <div className="absolute bottom-10 left-0 w-28 h-16 bg-blue-500 rounded-lg shadow-xl transform -rotate-6 p-2 text-xs text-white z-0">
        <CreditCard className="w-4 h-4" />
        <p className="mt-1 font-mono">**** 1234</p>
      </div>
    </div>
  </div>
);


// --- Main Application Component ---

const PaymentDashboard = () => {
  return (
    <div className="space-y-6">

      {/* 2. Main Content Section */}
      <main className="relative py-6 overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-white p-6 sm:p-12 rounded-xl shadow-2xl border border-gray-100">
            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* Left Column: Text and Features */}
              <div className="order-2 md:order-1">

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-8 leading-tight">
                  Make a <span className="text-red-600">Payment</span> / Deposit
                </h1>

                {/* Features List */}
                <div className="space-y-6">
                  <FeatureListItem icon={CheckCircle}>
                  With our Pay Online feature, you have a **hassle-free option** to make payments to the Hospital for a family member, friend or yourself.
                  </FeatureListItem>

                  <FeatureListItem icon={CheckCircle}>
                    Make payment **24/7 online** anytime / anywhere / any day
                  </FeatureListItem>

                  <FeatureListItem icon={CheckCircle}>
                    All major **debit and credit cards** accepted
                  </FeatureListItem>

                  <FeatureListItem icon={CheckCircle}>
                    Secure payment gateway
                  </FeatureListItem>

                  {/* Payment Method Details */}

                  <div className="space-y-6 pt-4 border-t border-gray-200">

                    {/* UPI Section */}
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <Zap className="h-6 w-6 mr-3 text-red-600" /> UPI
                    </h3>
                    <div className="ml-9 flex items-center space-x-3">
                      <PaymentIcon name="UPI" color="bg-green-600" />
                      <p className="text-sm text-gray-500">- All major UPI apps</p>
                    </div>

                    {/* Credit/Debit Card Section */}
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <CreditCard className="h-6 w-6 mr-3 text-red-600" /> Credit/Debit Card
                    </h3>
                    <div className="ml-9 flex flex-wrap gap-4">
                      <PaymentIcon name="VISA" color="bg-blue-600" />
                      <PaymentIcon name="RuPay" color="bg-orange-500" />
                      <PaymentIcon name="Master" color="bg-gray-700" />
                    </div>

                    {/* Net Banking Section */}
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <Banknote className="h-6 w-6 mr-3 text-red-600" /> Net Banking
                    </h3>
                    <div className="ml-9 flex flex-wrap gap-4">
                      <BankLogo name="SBI" bgColor="bg-blue-800" />
                      <BankLogo name="HDFC" bgColor="bg-red-700" />
                      <BankLogo name="ICICI" bgColor="bg-orange-500" />
                      <BankLogo name="AXIS" bgColor="bg-pink-700" />
                      <BankLogo name="Yes Bank" bgColor="bg-green-700" />
                    </div>

                    {/* Wallets Section */}
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <Wallet className="h-6 w-6 mr-3 text-red-600" /> Wallets
                    </h3>
                    <p className="ml-9 text-gray-600">All the Major Wallets are supported.</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Illustration */}
              <div className="order-1 md:order-2">
                <PaymentIllustration />
              </div>

            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default PaymentDashboard;
