import React, { useEffect } from 'react';
import skull from '../assets/repmateKing.png';

const VikingToast = ({ message, visible, onClose }) => {
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
        ${visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'}
      `}
      style={{ zIndex: 9999 }}
    >
      <div className="relative flex items-center bg-gradient-to-r from-zinc-900 to-zinc-950 text-white rounded-lg shadow-xl border border-zinc-700 px-6 py-4 min-w-[320px] max-w-[500px]">

        <img
          src={skull}
          alt="Skull"
          className="absolute -left-8 h-44 w-44 object-contain drop-shadow-lg"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />

        <div className="pl-24 text-left">
          <h1 className="text-xl font-bold tracking-wide mb-1">⚔️ Hey Preacher!</h1>
          <p className="text-sm text-zinc-300">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default VikingToast;
