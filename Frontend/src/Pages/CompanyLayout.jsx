import React from 'react';
import { motion } from 'framer-motion';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const CompanyLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-44 pb-20 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center lg:text-left space-y-4"
          >
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        </div>
        
        {/* Subtle Decorative Element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-48 -mt-24 pointer-events-none" />
      </section>

      {/* Content Section */}
      <main className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CompanyLayout;
