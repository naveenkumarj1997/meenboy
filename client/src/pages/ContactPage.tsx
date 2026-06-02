import { motion } from "framer-motion";
import { useState } from "react";
import type { FormEvent } from "react";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // In a real app, you would send this data to an API
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 3000);
  };

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Get in <span className="text-teal-400">Touch</span></h1>
        <div className="w-24 h-1 bg-teal-500 mx-auto rounded-full mb-6"></div>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Have a question about your order, our sourcing, or anything else? Our customer service team is ready to help you.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-cyan-900/50 rounded-2xl p-8 border border-cyan-800"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input
                type="text"
                id="name"
                required
                className="w-full rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                id="email"
                required
                className="w-full rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">Message</label>
              <textarea
                id="message"
                required
                rows={5}
                className="w-full rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-3 text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              ></textarea>
            </div>
            
            <button
              type="submit"
              className="w-full rounded-lg bg-teal-500 px-4 py-3 font-semibold text-white hover:bg-teal-400 transition-colors shadow-lg"
            >
              {submitted ? "Message Sent!" : "Send Message"}
            </button>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col justify-center space-y-10"
        >
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-teal-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Email Us</h3>
              <p className="text-slate-400 mb-1">For general inquiries:</p>
              <a href="mailto:support@meenboy.com" className="text-teal-400 hover:text-teal-300">support@meenboy.com</a>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-14 h-14 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-teal-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Call Us</h3>
              <p className="text-slate-400 mb-1">Mon-Fri from 8am to 5pm.</p>
              <a href="tel:+15551234567" className="text-teal-400 hover:text-teal-300">+1 (555) 123-4567</a>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="w-14 h-14 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-teal-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Headquarters</h3>
              <p className="text-slate-400">
                123 Ocean Drive<br />
                Sea View City, SC 12345
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactPage;
