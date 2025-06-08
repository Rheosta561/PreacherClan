import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatch } from '../context/MatchContext';
import repMateKing from '../assets/repmateKing.png'; 

function MatchListener() {
  const { match, setMatch } = useMatch();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!match) return;

    setStep(0);
    const timers = [
      setTimeout(() => setStep(2), 4000), // Show final message
      setTimeout(() => setMatch(null), 6000), // Hide after 6 sec
    ];

    return () => timers.forEach(clearTimeout);
  }, [match, setMatch]);

  if (!match) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      >
        {/* Step 0: Username Banner */}
        {step === 0 && (
          <motion.div
            className="bg-zinc-950 p-6 rounded-xl shadow-2xl text-center w-[350px] border-zinc-800 border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={match.image || repMateKing}
              alt={match.username || 'Matched User'}
              className="object-cover rounded-full mb-4"
            />
            <h1 className="text-xl font-semibold mb-2 text-white">
              {match.username || 'Kings Raven'}
            </h1>
          </motion.div>
        )}

        {/* Step 2: Final Message with Image and Text */}
        {step === 2 && (
          <motion.div
            className="absolute z-50 text-white px-6 w-full max-w-md text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="w-full rounded-lg overflow-hidden border border-zinc-800 shadow-lg">
              <img
                src={match.image || repMateKing}
                alt={match.username || 'Match'}
                className="w-full h-auto object-cover brightness-75"
              />
              <div className="inset-0 flex flex-col items-center justify-center text-center px-4 py-3 bg-black bg-opacity-50">
                <h2
                  className="text-3xl mb-2 text-zinc-50 drop-shadow-lg font-semibold"
                  style={{ fontFamily: "'UnifrakturCook', cursive" }}
                >
                  Match of the Clan
                </h2>
                <p
                  className="text-md text-zinc-200"
                  style={{ fontFamily: "'MedievalSharp', cursive" }}
                >
                  {match.username || 'User'} has accepted your call. Train with honor.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default MatchListener;
