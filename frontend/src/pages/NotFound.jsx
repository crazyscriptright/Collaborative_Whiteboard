import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import lottie from 'lottie-web';

const NotFound = () => {
  const animationContainer = useRef(null);

  useEffect(() => {
    if (animationContainer.current) {
      const animation = lottie.loadAnimation({
        container: animationContainer.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/404.json'
      });

      return () => animation.destroy();
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <div className="flex-grow relative overflow-hidden flex items-center justify-center pt-32 pb-20 px-4">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50"></div>
        
        {/* Animated Blobs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Lottie Animation */}
          <div 
            ref={animationContainer} 
            className="w-64 h-64 md:w-96 md:h-96 mx-auto mb-8"
          ></div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-amber-900" style={{fontFamily: "'Playfair Display', serif"}}>
            Page Not Found
          </h2>
          
          <p className="text-xl text-amber-800 mb-10 max-w-lg mx-auto leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
            Oops! It looks like you've ventured into uncharted territory. The page you are looking for might have been moved or doesn't exist.
          </p>
          
          <Link 
            to="/" 
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:-translate-y-1"
            style={{fontFamily: "'Inter', sans-serif"}}
          >
            <span className="relative z-10">Return Home</span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
          </Link>
        </div>
      </div>

      <Footer />
      
      <style>
        {`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}
      </style>
    </div>
  );
};

export default NotFound;
