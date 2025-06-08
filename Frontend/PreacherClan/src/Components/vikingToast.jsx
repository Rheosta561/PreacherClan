// VikingToast.jsx
import React, { useEffect } from 'react';
import skull from '../assets/repmateKing.png';

const vikingToast = ({ message, visible, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <div
      className={`fixed bottom-24 left-44 transform -translate-x-1/2 transition-all duration-500 ease-in-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
      `}
      style={{ zIndex: 9999 }}
    >
      <div className="relative flex items-center bg-gradient-to-r from-zinc-900 to-zinc-950 text-white rounded-lg shadow-xl border border-zinc-700 px-6 py-4 min-w-[320px] max-w-[500px]">
        {/* Skull Image */}
        <img
          src={skull}
          alt="Skull"
          className="absolute -left-8 h-44 w-44 object-contain  drop-shadow-lg"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        {/* Text Box */}
        <div className="pl-24 text-left">
          <h1 className="text-xl font-bold tracking-wide mb-1">⚔️ Viking Alert!</h1>
          <p className="text-sm text-zinc-300">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default vikingToast;
