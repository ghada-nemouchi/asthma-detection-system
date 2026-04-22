// src/pages/Start.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Start = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-8 py-16"
      style={{ background: '#547bfb' }}
    >
      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Lung Icon */}
        <div className="mb-2">
          <img
            src="/lung.png"
            alt="Lungs icon"
            className="w-28 h-28 object-contain"
            
          />
        </div>

        {/* App Name */}
        <h1
          className="text-4xl font-semibold text-white tracking-wide"
          style={{ fontFamily: "'Nunito', 'Poppins', sans-serif", letterSpacing: '0.04em' }}
        >
          Asthmicare
        </h1>
        <p class="text-white tracking-wide">Doctor Portal</p>
      </div>

      {/* Start Button at bottom */}
      <div className="w-full max-w-xs">
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-white text-gray-500 font-medium py-4 rounded-full shadow-md flex items-center justify-center gap-2 text-base hover:bg-gray-50 transition-all active:scale-95"
          style={{ fontFamily: "'Nunito', 'Poppins', sans-serif" }}
        >
          start
          <span className="text-lg">→</span>
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Start;
