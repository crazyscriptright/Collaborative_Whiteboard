import React from 'react';
import { Link } from 'react-router-dom';
import { isAuthenticated } from '../utils/jwt';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Home = () => {
  const authenticated = isAuthenticated();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden min-h-screen pt-20 flex items-center">
        <style>
          {`
            @keyframes slow-zoom {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .animate-slow-zoom {
              animation: slow-zoom 20s infinite ease-in-out;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .animate-bounce-slow {
              animation: float 3s ease-in-out infinite;
            }
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
        {/* Hero Image Background with Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
            style={{ backgroundImage: "url('/hero.jpg')" }}
          ></div>
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50/70 via-white/60 to-amber-50/70 lg:from-amber-50/95 lg:via-white/90 lg:to-amber-50/95 backdrop-blur-[1px] lg:backdrop-blur-[2px]"></div>
          
          {/* Animated floating elements over the image */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-400/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl font-bold mb-6" style={{fontFamily: "'Playfair Display', serif"}}>
                <span className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 bg-clip-text text-transparent">
                  Create.
                </span>
                <br />
                <span className="bg-gradient-to-r from-orange-700 via-amber-700 to-orange-700 bg-clip-text text-transparent">
                  Collaborate.
                </span>
                <br />
                <span className="bg-gradient-to-r from-yellow-700 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Innovate.
                </span>
              </h1>
              
              <p className="text-xl text-amber-800 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                Transform your ideas into reality with our cutting-edge collaborative whiteboard. 
                Draw, brainstorm, and innovate together in real-time, no matter where your team is located.
              </p>
              
              {!authenticated && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-16">
                  <Link 
                    to="/register" 
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:-translate-y-1"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    <span className="relative z-10">Start Creating Free</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  </Link>
                  <Link 
                    to="/login" 
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-amber-800 bg-white border-2 border-amber-600 rounded-2xl hover:border-amber-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    Sign In
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

              {authenticated && (
                <div className="mb-16 flex justify-center lg:justify-start">
                  <Link 
                    to="/whiteboard" 
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:-translate-y-1"
                    style={{fontFamily: "'Inter', sans-serif"}}
                  >
                    <span className="relative z-10">Open Whiteboard</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                  </Link>
                </div>
              )}
            </div>

            <div className="relative hidden lg:block max-w-md mx-auto">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 transform rotate-2 hover:rotate-0 transition duration-500 group">
                  <img src="/hero.jpg" alt="Collaborative Whiteboard" className="w-full h-auto object-cover transform group-hover:scale-105 transition duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-amber-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
              <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-orange-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{fontFamily: "'Playfair Display', serif"}}>
              <span className="bg-gradient-to-r from-amber-900 to-orange-800 bg-clip-text text-transparent">
                Powerful Features for
              </span>
              <br />
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Modern Teams
              </span>
            </h2>
            <p className="text-xl text-amber-800 max-w-3xl mx-auto" style={{fontFamily: "'Inter', sans-serif"}}>
              Everything you need to transform your collaborative workflow
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-amber-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Real-time Sync</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  See changes instantly as your team draws and edits. Experience true real-time collaboration with zero lag.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-orange-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Advanced Tools</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Professional drawing tools with customizable brushes, shapes, and annotations for every creative need.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-yellow-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Live Chat</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Integrated messaging system keeps conversations flowing while you create and collaborate.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-700 to-orange-700 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-amber-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Enterprise Security</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Bank-grade encryption and secure authentication keep your sensitive projects protected.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-orange-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Cloud Sync</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Automatic cloud backup ensures your work is always saved and accessible from any device.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-yellow-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Lightning Fast</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Optimized performance ensures smooth drawing and instant response times for the best user experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="relative py-24 bg-gradient-to-b from-white to-amber-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(245,158,11,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{fontFamily: "'Playfair Display', serif"}}>
              <span className="bg-gradient-to-r from-amber-900 to-orange-800 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-amber-700 max-w-3xl mx-auto" style={{fontFamily: "'Inter', sans-serif"}}>
              Get started with collaborative whiteboarding in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-amber-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white" style={{fontFamily: "'Inter', sans-serif"}}>1</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Create Account</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Sign up for a free account in seconds. No credit card required to get started with our platform.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-yellow-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-orange-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white" style={{fontFamily: "'Inter', sans-serif"}}>2</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-orange-600/20 to-yellow-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Create Whiteboard</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Create a new whiteboard or join an existing one shared by your team members.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-yellow-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white" style={{fontFamily: "'Inter', sans-serif"}}>3</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-amber-900 mb-4" style={{fontFamily: "'Playfair Display', serif"}}>Start Collaborating</h3>
                <p className="text-amber-700 leading-relaxed" style={{fontFamily: "'Inter', sans-serif"}}>
                  Invite team members and start drawing, brainstorming, and collaborating in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Lines */}
          <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl">
            <svg className="w-full h-2" viewBox="0 0 400 8" fill="none">
              <defs>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#EC4899" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path d="M20 4 L380 4" stroke="url(#connectionGradient)" strokeWidth="2" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!authenticated && (
        <div className="relative py-32 overflow-hidden">
          {/* Background with sophisticated gradients */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-900 to-slate-900"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-500/10 to-orange-500/20"></div>
            
            {/* Animated particles */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>

          <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-5xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white via-amber-200 to-orange-200 bg-clip-text text-transparent">
                Start Creating
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Together Today
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of teams already collaborating more effectively with our powerful whiteboard platform
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/register"
                className="group relative px-12 py-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/25"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;