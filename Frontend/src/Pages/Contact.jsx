import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, Globe, Loader2 } from 'lucide-react';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';
import { contactApi } from '../services/api';
import { toast } from 'react-toastify';

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: 'General Support',
    organization: '',
    message: ''
  });

  const contactInfo = [
    { icon: <Mail size={20} />, title: "Email Us", val: "amitmaurya3276@gmail.com", sub: "For general inquiries and support" },
    { icon: <Phone size={20} />, title: "Call Us", val: "+91 8874614138", sub: "Mon-Fri from 9am to 6pm" },
    { icon: <MapPin size={20} />, title: "Office", val: "Gomtinagar Vistar, Lucknow", sub: "Uttar Pradesh, India" }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await contactApi.submit(formData);
      toast.success('Your message has been sent successfully!');
      setFormData({
        fullName: '',
        email: '',
        subject: 'General Support',
        organization: '',
        message: ''
      });
    } catch (error) {
      console.error('Contact form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* Hero Header */}
      <section className="pt-44 pb-20 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] -mr-64 -mt-32" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center lg:text-left">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
           >
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-none mb-6">Contact Us</h1>
              <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">
                We're here to help you modernize your healthcare practice. Reach out to our team for any questions or support.
              </p>
           </motion.div>
        </div>
      </section>

      <main className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-20">
          
          {/* Left Side: Info */}
          <div className="lg:w-1/3 space-y-12">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Get in Touch</h2>
              <p className="text-slate-500 font-medium">Have specific questions about our modules? Our product experts are ready to assist you.</p>
            </div>

            <div className="space-y-6">
              {contactInfo.map((item, i) => (
                <div key={i} className="flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-50">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.title}</h3>
                    <p className="text-lg font-black text-slate-800 leading-tight">{item.val}</p>
                    <p className="text-xs text-slate-400 font-bold">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 bg-[#28328c] text-white rounded-[2.5rem] space-y-4 shadow-xl shadow-blue-900/10">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Globe size={20} />
               </div>
               <h3 className="text-xl font-black italic">Sales Inquiries</h3>
               <p className="text-blue-100/70 text-sm font-medium leading-relaxed">Interested in a demo for your multi-speciality hospital or pharmacy chain?</p>
               <button className="w-full py-4 bg-white text-[#28328c] font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-50 transition-all">
                 Schedule a Demo
               </button>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 bg-white border border-slate-200 shadow-2xl rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 text-slate-50 pointer-events-none">
                <MessageCircle size={120} strokeWidth={1} />
             </div>
             
             <div className="relative z-10">
               <h2 className="text-3xl font-black text-slate-900 mb-10 tracking-tight">Send us a message</h2>
               <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                         required
                         name="fullName"
                         value={formData.fullName}
                         onChange={handleChange}
                         type="text" 
                         placeholder="Enter your name"
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                       <input 
                         required
                         name="email"
                         value={formData.email}
                         onChange={handleChange}
                         type="email" 
                         placeholder="email@company.com"
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                       <select 
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 appearance-none">
                          <option>General Support</option>
                          <option>Sales Inquiry</option>
                          <option>Pharmacy Partner</option>
                          <option>Career Inquiry</option>
                          <option>Other</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization</label>
                       <input 
                         name="organization"
                         value={formData.organization}
                         onChange={handleChange}
                         type="text" 
                         placeholder="Clinic or Hospital Name"
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                     <textarea 
                       required
                       name="message"
                       value={formData.message}
                       onChange={handleChange}
                       placeholder="How can we help you?"
                       className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 min-h-[150px] resize-none"
                     />
                  </div>

                  <div className="pt-4">
                     <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                        {loading ? 'Sending...' : 'Send Message Now'}
                     </button>
                  </div>
               </form>
             </div>
          </div>
        </div>
      </main>

      {/* Trust Banner */}
      <section className="py-24 border-t border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Trusted by Innovators</h2>
           <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-24 opacity-40 grayscale">
              <span className="text-2xl font-black text-slate-900 tracking-tighter italic">HEAL-CORP</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter italic">VITA-CARE</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter italic">MED-LINK</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter italic">NOVA-HOSPITAL</span>
           </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Contact;

