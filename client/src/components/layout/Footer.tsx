import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-cyan-950 border-t border-cyan-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & About */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-2xl font-bold tracking-wider text-teal-400 block mb-4">
              MEENBOY
            </Link>
            <p className="text-sm">
              Your premier ocean-fresh seafood delivery partner. Quality and freshness guaranteed.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-teal-400 transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-teal-400 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-teal-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-teal-400 transition-colors">Customer Portal</Link></li>
              <li><Link to="/register" className="hover:text-teal-400 transition-colors">Partner with Us</Link></li>
              <li><Link to="/register" className="hover:text-teal-400 transition-colors">Delivery Jobs</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li>Email: support@meenboy.com</li>
              <li>Phone: +1 (555) 123-4567</li>
              <li>Address: 123 Ocean Drive, Sea View City, SC 12345</li>
            </ul>
          </div>
          
        </div>
        
        <div className="mt-8 pt-8 border-t border-cyan-800 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} MEENBOY. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
