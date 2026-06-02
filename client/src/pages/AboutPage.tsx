import { motion } from "framer-motion";

const AboutPage = () => {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About <span className="text-teal-400">MEENBOY</span></h1>
        <div className="w-24 h-1 bg-teal-500 mx-auto rounded-full"></div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-cyan-900 rounded-2xl p-8 border border-cyan-800 shadow-xl">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">Our Story</h2>
            <p className="text-slate-300 mb-4 leading-relaxed">
              Founded with a passion for the ocean, MEENBOY started with a simple mission: to bridge the gap between local fishermen and seafood lovers. We recognized that the journey from the dock to the dinner table was often too long, compromising the quality and freshness of the catch.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Today, MEENBOY is proud to offer a platform where customers can order premium, sustainably sourced seafood that is delivered fresh to their doorstep. Our state-of-the-art cold-chain delivery system ensures that every order arrives in pristine condition.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-900/50 border border-teal-500 flex items-center justify-center text-teal-400 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Sustainable Sourcing</h3>
              <p className="text-slate-400">We partner exclusively with fisheries that practice sustainable harvesting methods to protect our oceans for future generations.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-900/50 border border-teal-500 flex items-center justify-center text-teal-400 shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Ocean to Table in 24h</h3>
              <p className="text-slate-400">Our logistics network is optimized for speed. From the moment the boat docks to the moment we ring your doorbell.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage;
