import React from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

function ProfileCard({ profile, onRequest }) {
  const { image, name, age, goal, time, tags, preacherRank, isVerified } = profile;

  return (
    <motion.div
      className="relative w-[380px] max-w-md rounded-2xl overflow-hidden shadow-lg mt-4 bg-zinc-900 border border-zinc-800 text-white"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Image + Overlay */}
      <div className="relative">
        <img src={image} alt={`${name} profile`} className="w-full h-64 object-cover" />

        {/* Verified Badge */}
        {isVerified && (
          <div className="absolute bottom-2 left-2 bg-zinc-50 text-zinc-900 font-semibold text-xs px-2 py-1 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </div>
        )}

        {/* Preacher Rank Badge */}
        {preacherRank && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded shadow">
            {preacherRank}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-zinc-950/90 backdrop-blur">
        <h2 className="text-xl font-semibold">{name}, {age}</h2>
        <p className="text-sm text-zinc-400">Goal: {goal}</p>
        <p className="text-sm text-zinc-400">Preferred Time: {time}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-300">
          {tags.map((tag, idx) => (
            <span key={idx} className="bg-zinc-800 px-2 py-1 rounded-full capitalize">
              {tag}
            </span>
          ))}
        </div>

        {/* Request Button */}
        <button
          onClick={onRequest}
          className="mt-4 w-full py-2 rounded-md bg-zinc-50 hover:bg-zinc-900 text-zinc-950 hover:text-zinc-50 text-sm font-medium transition"
        >
          Request to Connect
        </button>
      </div>
    </motion.div>
  );
}

export default ProfileCard;
