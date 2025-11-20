import React from 'react';
import { Link } from 'react-router-dom';
import { isAuthenticated } from '../utils/jwt';

const Navbar = () => {
  const authenticated = isAuthenticated();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center space-x-2">
                  <img src="/favicon/android-chrome-192x192.png" alt="Drawvix Logo" className="w-10 h-10 rounded-xl" />
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-900 to-orange-800 bg-clip-text text-transparent" style={{fontFamily: "'Playfair Display', serif"}}>Drawvix</h1>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {authenticated ? (
                <>
                  <Link 
                    to="/whiteboard" 
                    className="hidden md:inline-flex bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    Go to Dashboard
                  </Link>
                  <Link 
                    to="/whiteboard"
                    className="md:hidden w-10 h-10 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full flex items-center justify-center hover:shadow-md transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-amber-800 hover:text-amber-900 px-3 py-2 md:px-4 rounded-lg font-medium transition-colors text-sm md:text-base"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register" 
                    className="hidden md:inline-flex bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
  );
};

export default Navbar;
