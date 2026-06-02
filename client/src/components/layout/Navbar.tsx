import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <nav className="bg-cyan-950 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold tracking-wider text-teal-400">
              MEENBOY
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-teal-400 transition-colors">Home</Link>
            <Link to="/about" className="hover:text-teal-400 transition-colors">About Us</Link>
            <Link to="/products" className="hover:text-teal-400 transition-colors">Products</Link>
            <Link to="/contact" className="hover:text-teal-400 transition-colors">Contact</Link>
            
            <Link to="/cart" className="relative text-white hover:text-teal-400 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-cyan-950">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="text-sm font-medium hover:text-teal-400">
                  Dashboard
                </Link>
                <button 
                  onClick={logout}
                  className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="hover:text-teal-400 font-medium">Login</Link>
                <Link 
                  to="/register" 
                  className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-teal-400 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-cyan-900 border-t border-cyan-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>Home</Link>
            <Link to="/about" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>About Us</Link>
            <Link to="/products" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>Products</Link>
            <Link to="/contact" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>Contact</Link>
            <Link to="/cart" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400 flex items-center justify-between" onClick={() => setIsOpen(false)}>
              Cart
              {itemCount > 0 && (
                <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>Dashboard</Link>
                <button 
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-teal-400 hover:bg-cyan-800 font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 rounded-md hover:bg-cyan-800 hover:text-teal-400" onClick={() => setIsOpen(false)}>Login</Link>
                <Link to="/register" className="block px-3 py-2 rounded-md text-teal-400 hover:bg-cyan-800 font-semibold" onClick={() => setIsOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
