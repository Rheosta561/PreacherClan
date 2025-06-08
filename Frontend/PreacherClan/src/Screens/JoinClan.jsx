import React, { useRef, useState, useEffect } from 'react';
import bg from '../assets/bg.jpg';
import JoinClanCard from '../Components/JoinClanCard';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

function JoinClan() {
  const { gymId } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanningStopped = useRef(false);
  const [gym, setGym] = useState({});
  const [manualCode, setManualCode] = useState('');

  // TODO: Replace this with actual userId from auth context or props
  const user = localStorage.getItem('user');
  if(!user){
    navigate('/login');
  }
  const userId = JSON.parse(user)._id;
  

  useEffect(() => {
    const fetchGym = async () => {
      try {
        const response = await axios.get(`https://preacherclan.onrender.com/gym/gym/${gymId}`);
        if (!response) {
          console.error('Gym Not Found');
          return;
        }
        const foundGym = response.data;
        setGym(foundGym);

        sessionStorage.setItem(`userGym`, JSON.stringify(foundGym.gym));
      } catch (error) {
        console.error('error', error.message);
      }
    };
    fetchGym();
  }, [gymId]);

  useEffect(() => {
    if (isScanning && qrRef.current) {
      scanningStopped.current = false; // reset flag when starting scan

      html5QrCodeRef.current = new Html5Qrcode('qr-scanner');

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      html5QrCodeRef.current
        .start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => {
            if (scanningStopped.current) return; // ignore if already stopped
            scanningStopped.current = true;

            const match = decodedText.match(/\d{6}/);
            const code = match ? match[0] : null;

            console.log('Scanned Code:', decodedText);

            html5QrCodeRef.current
              .stop()
              .then(() => {
                html5QrCodeRef.current.clear();
                setIsScanning(false);

                if (code) {
                  setTimeout(() => {
                    // Navigate or redirect to join with code and userId
                    window.open(`https://preacherclan.onrender.com/join/${code}/${userId}`);
                  }, 1500);
                } else {
                  alert('No valid 6-digit clan code found in QR.');
                }
              })
              .catch((err) => {
                console.error('Error stopping scanner:', err);
              });
          },
          (errorMessage) => {
            // scanning errors can be ignored or logged here
          }
        )
        .catch((err) => {
          console.error('QR Code Scan Error:', err);
          setIsScanning(false);
        });
    }

    // Cleanup on unmount or scanning stop
    return () => {
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch((err) => {
            console.error('Error during cleanup:', err);
          });
      }
    };
  }, [isScanning, gymId, navigate, userId]);

  const toggleScanner = () => {
    setIsScanning((prev) => !prev);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (/^\d{6}$/.test(manualCode)) {
      window.open(`https://preacherclan.onrender.com/join/${manualCode}/${userId}`);
    } else {
      alert('Please enter a valid 6-digit clan code.');
    }
  };

  return (
    <div className="h-screen w-screen">
      <img src={bg} alt="" className="absolute  inset-0 h-full w-full object-cover" />

      <div className="relative p-4">
        <h1 className="text-white text-4xl opacity-90 font-semibold">Clan</h1>
        <div className="h-14 mt-8 w-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center rounded-lg">
          <p className="text-zinc-300 text-sm">Join the Gym and become a Preacher</p>
        </div>
        <div className="h-44 w-full bg-zinc-950 mt-2 rounded-lg">
          <JoinClanCard gym={gym?.gym || gym} />
        </div>

        <form onSubmit={handleManualSubmit} className="mt-4 w-full flex flex-col items-center gap-2">
          <div className="h-14 w-full md:w-1/3 bg-[rgba(255,255,255,0.14)] rounded-lg flex items-center px-4">
            <input
              type="text"
              maxLength={6}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))} // only digits allowed
              placeholder="Enter the 6-digit Clan Code, e.g. 123456"
              className="bg-transparent w-full outline-none text-zinc-300 placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            className="h-12 w-full md:w-1/3 bg-zinc-950 rounded-lg text-zinc-300 font-semibold hover:bg-zinc-800 transition"
          >
            Join with Code
          </button>
        </form>

        <div className="w-full flex items-center justify-center gap-2 mt-6">
          <hr className="w-1/2 border-zinc-50 opacity-30 border" />
          <span className="text-zinc-300 opacity-75 text-lg">Or</span>
          <hr className="w-1/2 border-zinc-50 opacity-30 border" />
        </div>

        {/* SCAN QR BUTTON */}
        <div
          onClick={toggleScanner}
          className={`h-14 w-full md:w-1/3 mx-auto ${
            isScanning ? 'bg-red-800' : 'bg-zinc-950'
          } mt-2 rounded-lg flex items-center justify-center cursor-pointer transition-all`}
        >
          <p className="text-zinc-300 font-semibold">{isScanning ? 'Stop Scanning' : 'Scan QR'}</p>
        </div>

        {isScanning && (
          <div
            id="qr-scanner"
            ref={qrRef}
            className="w-full h-64 mt-4 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300"
          />
        )}

        <div className="w-full text-center text-sm mt-4 text-zinc-300 opacity-80">
          Please scan the QR code available at your gym. If you don't have a code, you can enter it manually above.
        </div>
        <div className="w-full h-32 bg-[rgba(255,255,255,0.1)] mt-12 rounded-lg flex items-center justify-center p-6">
          <p className="text-zinc-100 text-center text-xs opacity-60">
            This Gym is officially certified and verified by Preacher Clan, ensuring the highest quality of service and safety for all members. However, Preacher Clan is not liable for any injuries or accidents that may occur at the gym.
          </p>
        </div>
      </div>
    </div>
  );
}

export default JoinClan;
