import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SwipeInstructions = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide instructions after 3 seconds
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="absolute top-1/2 w-72  left-1/2 right-1/2 -ml-36 -translate-x-1/2  bg-opacity-90 text-white px-5 py-2 rounded-full shadow-lg text-sm select-none z-50"
        >
            <div className=" text-2xl font-semibold">
                Swipe Left for Request
                <p>Swipe Right to Reject</p>
            </div>
          
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeInstructions;
