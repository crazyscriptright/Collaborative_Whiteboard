import React from 'react';
import { Link } from 'react-router-dom';
import { isAuthenticated } from '../utils/jwt';

const Home = () => {
  const authenticated = isAuthenticated();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">CollabBoard</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {authenticated ? (
                <>
                  <Link 
                    to="/whiteboard" 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Real-time Collaboration Platform
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                Create.
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                Collaborate.
              </span>
              <br />
              <span className="bg-gradient-to-r from-pink-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                Innovate.
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Transform your ideas into reality with our cutting-edge collaborative whiteboard. 
              Draw, brainstorm, and innovate together in real-time, no matter where your team is located.
            </p>
            
            {!authenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link 
                  to="/register" 
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <span className="relative z-10">Start Creating Free</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                </Link>
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-2xl hover:border-gray-400 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
                >
                  Sign In
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}

            {authenticated && (
              <div className="mb-16">
                <Link 
                  to="/whiteboard" 
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <span className="relative z-10">Open Whiteboard</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                </Link>
              </div>
            )}

            {/* Demo Preview */}
            <div className="relative">
              <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-2xl">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="bg-white rounded-xl p-6 min-h-48 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <p className="text-lg font-medium">Interactive Whiteboard</p>
                      <p className="text-sm">Real-time collaboration in action</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Powerful Features for
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Modern Teams
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to transform your collaborative workflow
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Real-time Sync</h3>
                <p className="text-gray-600 leading-relaxed">
                  See changes instantly as your team draws and edits. Experience true real-time collaboration with zero lag.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced Tools</h3>
                <p className="text-gray-600 leading-relaxed">
                  Professional drawing tools with customizable brushes, shapes, and annotations for every creative need.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Live Chat</h3>
                <p className="text-gray-600 leading-relaxed">
                  Integrated messaging system keeps conversations flowing while you create and collaborate.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Security</h3>
                <p className="text-gray-600 leading-relaxed">
                  Bank-grade encryption and secure authentication keep your sensitive projects protected.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Cloud Sync</h3>
                <p className="text-gray-600 leading-relaxed">
                  Automatic cloud backup ensures your work is always saved and accessible from any device.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
                <p className="text-gray-600 leading-relaxed">
                  Optimized performance ensures smooth drawing and instant response times for the best user experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="relative py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with collaborative whiteboarding in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Account</h3>
                <p className="text-gray-600 leading-relaxed">
                  Sign up for a free account in seconds. No credit card required to get started with our platform.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Whiteboard</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create a new whiteboard or join an existing one shared by your team members.
                </p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <div className="relative mx-auto mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-full blur-lg"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Collaborating</h3>
                <p className="text-gray-600 leading-relaxed">
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
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/10 to-pink-500/20"></div>
            
            {/* Animated particles */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>

          <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-5xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Start Creating
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Together Today
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of teams already collaborating more effectively with our powerful whiteboard platform
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/register"
                className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </Link>
              
              <button className="group px-8 py-6 border-2 border-gray-600 text-gray-300 text-lg font-semibold rounded-full transition-all duration-300 hover:border-white hover:text-white hover:bg-white/5 backdrop-blur-sm">
                <span className="flex items-center gap-3">
                  Watch Demo
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-400">
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative bg-gray-900 text-white">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
        
        <div className="relative py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    CollabBoard
                  </h3>
                </div>
                <p className="text-gray-400 leading-relaxed max-w-md">
                  The ultimate collaborative whiteboard platform for modern teams. Bring your ideas to life with real-time collaboration and powerful drawing tools.
                </p>
                <div className="flex gap-4 mt-6">
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.749-1.378 0 0-.593 2.25-.738 2.805-.268 1.01-1.017 2.275-1.495 3.044C9.563 23.77 10.779 24.001 12.017 24.001c6.624-.001 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                    </svg>
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-6 text-white">Product</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Features
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Pricing
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    API
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Integrations
                  </a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-6 text-white">Support</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Help Center
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Contact Us
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Status
                  </a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                    Community
                  </a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-12 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-gray-400">&copy; 2025 CollabBoard. All rights reserved.</p>
                <div className="flex gap-6 text-sm">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Terms of Service</a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Cookie Policy</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;