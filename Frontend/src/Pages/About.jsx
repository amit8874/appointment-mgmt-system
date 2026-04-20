import React from 'react';
import CompanyLayout from './CompanyLayout';
import { Target, Heart, Award, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const About = () => {
  const values = [
    { icon: <Target className="text-blue-600" />, title: "Precision", desc: "We build tools that deliver exact results, helping clinicians make better decisions." },
    { icon: <Heart className="text-rose-600" />, title: "Care", desc: "Everything we do is centered around improving the patient experience." },
    { icon: <Award className="text-amber-600" />, title: "Excellence", desc: "We don't settle for 'good enough'. We push the boundaries of healthcare tech." },
    { icon: <ShieldCheck className="text-emerald-600" />, title: "Security", desc: "Your data is protected by industry-leading security protocols." }
  ];

  return (
    <CompanyLayout 
      title="About Oviaan" 
      subtitle="Modernizing healthcare management through AI-powered innovation and patient-centric design."
    >
      <div className="space-y-24">
        {/* Story Section */}
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Our Story</h2>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Oviaan was founded with a single mission: to eliminate the friction in healthcare delivery. 
              We saw doctors overwhelmed by paperwork and patients frustrated by long wait times.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              By combining cutting-edge artificial intelligence with deep clinical insights, we've built a 
              platform that automates the mundane, so healthcare professionals can focus on what matters most—healing.
            </p>
          </div>
          <div className="lg:w-1/2">
             <img 
               src="https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=800" 
               alt="Healthcare Innovation" 
               className="rounded-[3rem] shadow-2xl"
             />
          </div>
        </div>

        {/* Values Grid */}
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-16">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center space-y-4"
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                  {v.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900">{v.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
};

export default About;
