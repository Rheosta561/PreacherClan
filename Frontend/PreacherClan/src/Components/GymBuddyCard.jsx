import React from "react";
import { motion, useAnimation } from "framer-motion";

function GymBuddyCard({ profile, onSwipe }) {
  const controls = useAnimation();

  const handleSwipe = (direction) => {
    const xOffset = direction === "right" ? 1000 : -1000;
    controls
      .start({ x: xOffset, opacity: 0 })
      .then(() => {
        onSwipe(direction);
        controls.set({ x: 0, opacity: 1 }); // reset for next card
      });
  };

  return (
    <motion.div
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg bg-zinc-900 border border-zinc-800 text-white"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(event, info) => {
        if (info.offset.x > 150) handleSwipe("right");
        else if (info.offset.x < -150) handleSwipe("left");
      }}
      animate={controls}
      initial={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Conditionally show match badge */}
      {/* You can also pass a prop to control this */}
      {/* For example, show if direction was right */}

      {/* Profile Image */}
      <img
        src={profile.image}
        alt={`${profile.name} profile`}
        className="w-full h-2/3 object-cover"
      />

      {/* Gradient */}
      <div className="absolute bottom-1/3 left-0 right-0 h-1/3 bg-gradient-to-t from-zinc-900 via-zinc-900/70 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1 bg-zinc-950/80">
        <h2 className="text-lg font-semibold">
          {profile.name}, {profile.age}
        </h2>
        <p className="text-sm text-zinc-400">Goal: {profile.goal}</p>
        <p className="text-sm text-zinc-400">Training at {profile.time}</p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-300">
          {profile.tags.map((tag, idx) => (
            <span key={idx} className="bg-zinc-800 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default GymBuddyCard;
