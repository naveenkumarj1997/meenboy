import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const Icon = ({
  children,
  className = "w-5 h-5 shrink-0"
}: {
  children: ReactNode;
  className?: string;
}) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    {children}
  </svg>
);

const WhatsAppIcon = ({ className = "w-5 h-5 shrink-0 text-[#25D366]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.52 3.48A11.86 11.86 0 0012.01 0C5.4 0 .04 5.36.04 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.94 11.94 0 005.8 1.48h.01c6.61 0 11.97-5.36 11.97-11.97 0-3.2-1.25-6.21-3.46-8.41zM12 21.48h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.68.96.98-3.58-.23-.37a9.48 9.48 0 01-1.45-5.05C2.42 6.68 6.7 2.4 12 2.4c2.54 0 4.93.99 6.73 2.79a9.45 9.45 0 012.78 6.72c0 5.3-4.28 9.57-9.51 9.57zm5.22-7.14c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.43s1.02 2.82 1.17 3.01c.14.19 2.01 3.07 4.87 4.31.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.11-.26-.18-.55-.32z" />
  </svg>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  const mobileLinkClass =
    "flex items-center gap-3 px-3 py-3 rounded-md hover:bg-cyan-800 hover:text-teal-400 text-base font-medium";

  return (
    <nav className="bg-cyan-950 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-wider text-teal-400">
              <span>FISHFRIENDLY</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6" />
              </Icon>
              Home
            </Link>
            <Link to="/about" className="hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </Icon>
              About Us
            </Link>
            <Link to="/products" className="hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
              </Icon>
              Products
            </Link>
            <Link to="/whatsapp" className="hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
              WhatsApp
            </Link>
            <Link to="/contact" className="hover:text-teal-400 transition-colors inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </Icon>
              Contact
            </Link>

            <Link to="/cart" className="relative text-white hover:text-teal-400 transition-colors p-2 inline-flex items-center" aria-label="Cart">
              <Icon className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </Icon>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-cyan-950">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="text-sm font-medium hover:text-teal-400 inline-flex items-center gap-1.5">
                  <Icon className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </Icon>
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
                <Link to="/login" className="hover:text-teal-400 font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: cart + menu */}
          <div className="md:hidden flex items-center gap-1">
            <Link to="/cart" className="relative text-white hover:text-teal-400 p-2" aria-label="Cart">
              <Icon className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </Icon>
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-bold h-4 min-w-4 px-0.5 rounded-full flex items-center justify-center border-2 border-cyan-950">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-teal-400 focus:outline-none p-2"
              aria-label={isOpen ? "Close menu" : "Open menu"}
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
          <div className="px-2 pt-2 pb-3 space-y-0.5 sm:px-3">
            <Link to="/" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
              <Icon>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6" />
              </Icon>
              Home
            </Link>
            <Link to="/about" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
              <Icon>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </Icon>
              About Us
            </Link>
            <Link to="/products" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
              <Icon>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
              </Icon>
              Products
            </Link>
            <Link to="/whatsapp" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
              <WhatsAppIcon />
              WhatsApp
            </Link>
            <Link to="/contact" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
              <Icon>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </Icon>
              Contact
            </Link>
            <Link to="/cart" className={`${mobileLinkClass} justify-between`} onClick={() => setIsOpen(false)}>
              <span className="inline-flex items-center gap-3">
                <Icon>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </Icon>
                Cart
              </span>
              {itemCount > 0 && (
                <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <>
                <Link to="/dashboard" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
                  <Icon>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </Icon>
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className={`${mobileLinkClass} w-full text-left text-teal-400`}
                >
                  <Icon>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </Icon>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={mobileLinkClass} onClick={() => setIsOpen(false)}>
                  <Icon>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </Icon>
                  Login
                </Link>
                <Link to="/register" className={`${mobileLinkClass} text-teal-400`} onClick={() => setIsOpen(false)}>
                  <Icon>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </Icon>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
