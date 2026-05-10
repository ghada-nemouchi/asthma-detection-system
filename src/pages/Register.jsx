// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialty: 'Pulmonologist'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.specialty
    );

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Registration failed. Email may already exist.');
      setLoading(false);
    }
  };

  const specialties = [
    'Pulmonologist',
    'Allergist',
    'Pediatric Pulmonologist',
    'General Practitioner',
    'Respiratory Therapist'
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#547bfb', fontFamily: "'Nunito', 'Poppins', sans-serif" }}
    >
      {/* Top blue header */}
      <div className="relative flex flex-col px-8 pt-12 pb-20 overflow-hidden" style={{ minHeight: '200px' }}>
        {/* Faint lung watermark */}
        <div className="absolute right-4 top-10  pointer-events-none" style={{ width: '100px', height: '100px' }}>
          <img
            src="/lung.png"
            alt=""
            className="w-full h-full object-contain"
            
          />
        </div>

        {/* Back button */}
        <Link
          to="/login"
          className="relative z-10 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 w-fit transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Login
        </Link>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white tracking-wide mb-1">AsthmiCare</h1>
          <p className="text-white/80 text-sm leading-snug">
            Create your doctor account
          </p>
        </div>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl px-8 pt-8 pb-8 -mt-10 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Sign Up</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Dr. John Doe"
              required
              autoComplete="name"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="doctor@asthmacare.com"
              required
              autoComplete="email"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Specialty */}
          <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
              <circle cx="20" cy="10" r="2"/>
            </svg>
            <select
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent appearance-none"
            >
              {specialties.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password (min 6 chars)"
              required
              minLength="6"
              autoComplete="new-password"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-blue-400 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              required
              autoComplete="new-password"
              className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-4 rounded-2xl mt-1 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: '#547bfb' }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 font-semibold hover:text-blue-600">
            Sign In
          </Link>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
};

export default Register;
