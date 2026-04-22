// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid credentials.');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#547bfb', fontFamily: "'Nunito', 'Poppins', sans-serif" }}
    >
      {/* Top blue section with logo */}
      <div className="relative flex flex-col px-8 pt-12 pb-20 overflow-hidden" style={{ minHeight: '220px' }}>
        {/* Faint lung watermark */}
        <div
          className="absolute right-4 top-10 pointer-events-none"
          style={{ width: '100px', height: '100px' }}
        >
          <img
            src="/lung.png"
            alt=""
            className="w-full h-full object-contain"
            
          />
        </div>

        {/* App name & tagline */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white tracking-wide mb-1">AsthmiCare</h1>
          <p className="text-white/80 text-sm leading-snug max-w-[180px]">
            Intelligent Asthma Monitoring<br />& Prediction.
          </p>
        </div>
      </div>

      {/* White card overlapping the blue section */}
      <div
        className="flex-1 bg-white rounded-t-3xl px-8 pt-10 pb-8 -mt-10 shadow-xl"
        style={{ minHeight: '480px' }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Login</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div
            className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors"
          >
            {/* Email icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
              autoComplete="email"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Password */}
          <div
            className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors"
          >
            {/* Lock icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••"
              required
              autoComplete="current-password"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Forgot password */}
          <div className="text-right -mt-1">
            <button type="button" className="text-sm text-blue-500 hover:text-blue-600">
              Forget Password?
            </button>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-4 rounded-2xl mt-2 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: '#547bfb' }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500 mt-16">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-500 font-semibold hover:text-blue-600">
            Sign up
          </Link>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
};

export default Login;
