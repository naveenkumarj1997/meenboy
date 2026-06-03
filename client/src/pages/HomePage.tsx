import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedOceanScene from "../components/AnimatedOceanScene";

// SVG components for Sea Theme (used in benefits section)
const FishIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" fill="currentColor" className={className}>
    <path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-11.6 6.5-17.9 4.8L382 178c-12-3.2-24.8-1-35.1 6.1L272 235.3c-15.6 10.8-35.3 12.6-52.6 4.8L126.8 198c-8.9-4-19.3-2.5-26.7 3.8L53.7 241c-7.6 6.5-10.7 17-7.8 26.3l12.7 40.5c2.1 6.8 1.1 14.3-2.8 20.3L20 383c-6.8 10.6-2.5 24.8 8.8 30.1l54.4 25.5c8.2 3.8 17.8 2.3 24.6-3.8l49.5-44.2c6-5.4 14.2-7.4 21.9-5.3l57.7 15.4c12.2 3.3 25.3.8 35.5-6.8L347 338.4c14.6-10.9 33.5-13 50.1-5.6l57.3 25.6c8.5 3.8 18.5 2.1 25.5-4.3L506 330c6.7-6.2 9.5-15.8 7.2-24.6l-11.2-43.1c-2-7.5-1-15.6 2.7-22.3l37.2-66.5c6.3-11.2 1.3-25.5-10.6-30.2l-33.4-13.3zm-364 247.3c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zm224-152c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24z" />
  </svg>
);

const WaveDivider = () => (
  <div className="w-full overflow-hidden leading-0 -mt-1 relative z-10">
    <svg className="relative block w-full h-[60px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-cyan-950"></path>
    </svg>
  </div>
);

const HomePage = () => {
  return (
    <div className="flex flex-col items-center bg-white min-h-screen">
      {/* Premium Hero Section with Animated Ocean Scene */}
      <section className="w-full relative min-h-[90vh] flex flex-col items-center justify-start text-center px-4 sm:px-6 lg:px-8 overflow-hidden bg-cyan-950">
        {/* Animated Ocean Background */}
        <AnimatedOceanScene />

        <div className="relative z-10 max-w-5xl mx-auto pt-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 flex justify-center"
          >
            <span className="px-4 py-1.5 rounded-full border border-teal-500/50 bg-teal-500/10 text-teal-300 text-sm font-semibold tracking-wider uppercase backdrop-blur-sm">
              Premium Seafood Delivery
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-xl"
          >
            Ocean Fresh to Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">Doorstep</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-xl md:text-2xl text-cyan-100 max-w-3xl mx-auto font-light drop-shadow-lg"
          >
            MEENBOY connects you with the freshest catch of the day. Hand-selected, sustainably sourced, and delivered with uncompromising quality.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6"
          >
            <Link
              to="/products"
              className="group relative rounded-full bg-teal-500 px-8 py-4 font-bold text-white hover:bg-teal-400 transition-all duration-300 shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)] overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start Ordering
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Wave Transition */}
      <WaveDivider />

      {/* Featured Categories Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-cyan-950 mb-4">Explore Our Categories</h2>
          <p className="text-cyan-700 max-w-2xl mx-auto">Browse our wide selection of fresh, sustainably caught seafood.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Ocean Fish", img: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=500&q=80" },
            { name: "Shellfish", img: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=500&q=80" },
            { name: "Freshwater", img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=500&q=80" },
            { name: "Premium Cuts", img: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=500&q=80" }
          ].map((cat, idx) => (
            <Link key={idx} to={`/products?category=${encodeURIComponent(cat.name)}`} className="block">
              <motion.div 
                whileHover={{ y: -10 }}
                className="relative rounded-2xl overflow-hidden group cursor-pointer aspect-square shadow-lg h-full"
              >
                <img src={cat.img} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/90 via-cyan-900/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{cat.name}</h3>
                  <span className="text-teal-300 font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Range &rarr;
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Enhanced Why Choose Us Section */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 bg-cyan-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-cyan-950">The MEENBOY Difference</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-teal-400 to-cyan-500 mx-auto mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
                title: "Premium Quality",
                desc: "We source only the highest grade seafood directly from trusted fishermen. Every catch is quality-checked."
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                title: "Fast Delivery",
                desc: "Our specialized cold-chain delivery ensures your order arrives ocean-fresh, perfectly chilled every time."
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
                title: "Secure Payments",
                desc: "Enjoy peace of mind with our secure checkout process, robust data protection, and transparent pricing."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="flex flex-col items-center text-center p-8 rounded-3xl bg-white shadow-xl shadow-cyan-900/5 border border-cyan-100"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-8 text-white shadow-lg shadow-teal-500/30 transform rotate-3 hover:rotate-6 transition-transform">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-cyan-950 mb-4">{feature.title}</h3>
                <p className="text-cyan-700 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Benefits Section */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 bg-cyan-950 text-white relative overflow-hidden">
        {/* Subtle background wave */}
        <div className="absolute -bottom-20 -right-20 opacity-10 w-96 h-96">
          <FishIcon className="w-full h-full" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Exclusive Benefits for MEENBOY Members</h2>
            <p className="text-cyan-200 text-lg mb-10 leading-relaxed">
              Create an account today and dive into a sea of exclusive perks designed to give you the best seafood experience possible.
            </p>
            
            <ul className="space-y-6">
              {[
                "Reward Points on every purchase",
                "Free Delivery on orders over ₹100",
                "Early access to rare seasonal catches",
                "Priority customer support"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-4 text-lg">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            
            <div className="mt-12">
              <Link
                to="/register"
                className="inline-block rounded-full border-2 border-teal-400 px-8 py-3 font-bold text-teal-400 hover:bg-teal-400 hover:text-cyan-950 transition-colors"
              >
                Join Now for Free
              </Link>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80" 
                alt="Fresh sushi and seafood preparation" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-4 sm:-bottom-8 sm:-left-8 bg-white text-cyan-950 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-teal-500">5k+</div>
                <div className="text-sm font-bold leading-tight">Happy<br/>Customers</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
