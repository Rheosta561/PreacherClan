import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

function ProfileCard({ profile, onRequest }) {
  const { image, name, age, goal, time, tags, preacherRank, isVerified } = profile;
  const [user,setUser] = useState([]);

  const navigate = useNavigate();
  const localUser = JSON.parse(localStorage.getItem('user'));
  if(!localUser){
    navigate('/login');

  }
const handleRequest = async () => {
  try {
    // Optional check if profile.id exists
    if (!profile?.id || !localUser?._id || !profile || localUser) {
      console.error("Missing user ID or profile ID.");
      toast("⚠️ Error", {
        description: "Cannot send request — missing user information.",
        className: "bg-zinc-900 text-white border border-yellow-600 shadow-lg",
      });
      return;
    }

    const response = await axios.post(
      `https://preacherclan.onrender.com/requests/send/${localUser._id}/${profile.id}`
    );

    console.log("Request sent to server:", response);

    toast("🪓 Request Sent!", {
      description: `Your message sails to ${profile.name}'s village.`,
      className: "bg-zinc-900 text-white border border-red-800 shadow-lg",
    });
  } catch (error) {
    console.error("Error sending request:", error);

    let errorMessage = "An unexpected error occurred.";
    if (error.response) {
  
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      errorMessage = `Error ${error.response.status}: ${error.response.data.message || "Bad Request"}`;
    } else if (error.request) {
      
      console.error("No response received:", error.request);
      errorMessage = "No response from server. Please check your connection.";
    } else {
  
      errorMessage = error.message;
    }

    toast("⚠️ Request Failed", {
      description: errorMessage,
      className: "bg-zinc-900 text-white border border-yellow-600 shadow-lg",
    });
  }
};




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
  disabled={profile?.id == localUser?._id}
  onClick={handleRequest}
  className={`mt-4 w-full py-2 rounded-md text-sm font-medium transition
    ${profile?.id == localUser?._id
      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'  // disabled styles
      : 'bg-zinc-50 hover:bg-zinc-900 text-zinc-950 hover:text-zinc-50'
    }`}
>
  {profile?.id == localUser?._id ? 'You' : 'Send Request'}
</button>

      </div>
    </motion.div>
  );
}

export default ProfileCard;
