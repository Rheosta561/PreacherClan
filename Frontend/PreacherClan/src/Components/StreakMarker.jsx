import React, { useEffect, useRef, useState ,  } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { nav } from 'framer-motion/client';

function StreakMarker() {
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | success | error
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const userId = JSON.parse(localStorage.getItem('user'))._id; 
  if (!userId){
    navigate('/login'); 
  }
  const startScanner = () => {
    setScanStatus('scanning');

    html5QrCodeRef.current = new Html5Qrcode(qrRef.current.id);

    const qrConfig = {
      fps: 10,
      qrbox: 250,
    };

    html5QrCodeRef.current
      .start(
        { facingMode: 'environment' }, // rear camera
        qrConfig,
        (decodedText, decodedResult) => {
          // Success
          html5QrCodeRef.current.stop().then(() => {
            setScanStatus('success');
            setResult(decodedText);
            const match = decodedText.match(/\d{6}/)
            setTimeout(() => {
      window.location.href = `https://preacherclan.onrender.com/streak/${match}/${userId}`;
    }, 1500);  
          });
        },
       
      )
      .catch((err) => {
        setScanStatus('error');
        console.error('QR Code Scan Error:', err);
      });
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        setScanStatus('idle');
      });
    }
  };

  useEffect(() => {
    return () => {
      
      stopScanner();
    };
  }, []);

  const getStatusMessage = () => {
    switch (scanStatus) {
      case 'idle':
        return 'Ready to mark your streak';
      case 'scanning':
        return 'Scanning... Hold steady!';
      case 'success':
        return `Rune marked! Streak updated ⚔️ Code: ${result}`;
      case 'error':
        return 'Failed to scan. Try again.';
      default:
        return '';
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center shadow-lg text-white">
      <h2 className="text-2xl font-semibold mb-2 tracking-wide">RuneStreak Marker</h2>
      <p className="text-zinc-400 mb-6">Mark your Monthly Streak with honor 🛡️</p>

      <div className="flex flex-col items-center justify-center gap-4">
        {scanStatus !== 'scanning' ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 bg-green-800 hover:bg-green-900 px-6 py-2 rounded-lg text-lg transition-all"
          >
            <ScanLine className="h-5 w-5" />
            Scan Rune QR
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex items-center gap-2 bg-red-800 hover:bg-red-900 px-6 py-2 rounded-full text-lg transition-all"
          >
            Stop Scanning
          </button>
        )}

        <div className="mt-4 text-zinc-300 text-sm">{getStatusMessage()}</div>

        <div
  id="qr-reader"
  ref={qrRef}
  className={`mt-4 transition-all duration-300 ${
    scanStatus === 'scanning' ? 'block' : 'hidden'
  } border border-green-700 rounded-lg overflow-hidden`}
  style={{
    width: '300px',
    height: '300px',
    margin: '0 auto',
  }}
></div>


        {scanStatus === 'success' && (
          <ShieldCheck className="h-12 w-12 text-green-500 mt-4 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default StreakMarker;
