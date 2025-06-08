import React from "react";
import { CheckCircle, XCircle, CheckCircle2 } from "lucide-react";
import { div, span } from "framer-motion/client";

function RepMateCardRequest({ request, profile , onAccept, onReject }) {
  const {   isTrainer, gym, isVerified } = request;
  const name = request?.user?.name || "Unknown User"; // Fallback name if not provided
  const image = profile?.profileImage || "https://via.placeholder.com/150"; // Fallback image if none provided
  const tags = profile?.exerciseGenre || []; // Fallback to empty array if no tags


  return (
    <div className="w-[380px] max-w-md   ">
        <div className="relative w-[380px] max-w-md rounded-lg overflow-hidden shadow-lg  bg-zinc-900 border border-zinc-800 text-white">
      {/* Image + Overlay */}
      <div className="relative">
        <img src={image} alt={`${name} profile`} className="w-full h-64 object-cover " />

        {/* Verified Badge */}
        {isVerified && (
          <div className="absolute bottom-2 left-2 bg-zinc-50 text-zinc-900 font-semibold text-xs px-2 py-1 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-zinc-950/90 backdrop-blur">
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="text-sm text-zinc-400"> {isTrainer ? "Trainer" : "Member"}  {gym}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-300">
          {tags.map((tag, idx) => (
            <span key={idx} className="bg-zinc-800 px-2 py-1 rounded-full capitalize">
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-4">
          <div
            onClick={onAccept}
            className="flex-1 py-2 rounded-md bg-zinc-950 hover:bg-zinc-50 hover:text-zinc-950 text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Accept
          </div>
          <div
            onClick={onReject}
            className="flex-1 py-2 rounded-md bg-zinc-950 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </div>
        </div>
      </div>
    </div>

    </div>
    
  );
}

export default RepMateCardRequest;
