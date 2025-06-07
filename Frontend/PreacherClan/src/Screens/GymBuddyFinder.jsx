import React, { useState } from "react";
import BottomRow from "../Components/bottomRow";
import repmate from "../assets/repmate.png";
import GymBuddyCard from "../Components/GymBuddyCard";
import SwipeInstructions from "../Components/SwipeInstructions";
import { Toaster , toast } from "sonner";

const dummyProfiles = [
  {
    name: "Aarav",
    age: 24,
    goal: "Strength & Hypertrophy",
    time: "Gold’s Gym, 6AM",
    image:
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1",
    tags: ["Push/Pull", "Deadlifts", "Consistent"],
  },
  {
    name: "Sara",
    age: 28,
    goal: "Weight Loss",
    time: "Anytime Fitness, 7PM",
    image:
      "https://images.unsplash.com/photo-1533236897111-3e94666b2edf",
    tags: ["Cardio", "HIIT", "Dedicated"],
  },
  {
    name: "Rohan",
    age: 26,
    goal: "Endurance",
    time: "Cult Fit, 5AM",
    image:
      "https://images.unsplash.com/photo-1619946794135-1f75c3e8ef5f",
    tags: ["Cycling", "Functional", "Focused"],
  },
];

function GymBuddyFinder() {
  const [index, setIndex] = useState(0);

const handleSwipe = (direction) => {
  const profile = dummyProfiles[index];
  if (!profile) return;

  console.log(`Swiped ${direction} on ${profile.name}`);

  if (direction === "left") {
    toast("🪓 Request Sent!", {
      description: `Your message sails to ${profile.name}'s village.`,
      className: "bg-zinc-900 text-white border border-red-800 shadow-lg ",
    });
  } else if (direction === "right") {
    toast.error("💀 Rejected", {
      description: `${profile.name} was not chosen for your raid.`,
      className: "bg-zinc-900 text-white border border-zinc-700 shadow-lg ",
    });
  }

  setIndex((prev) => prev + 1);
};


  const currentProfile = dummyProfiles[index];

  return (
    <div className="h-screen w-screen relative text-white bg-zinc-950">
      <BottomRow />

      <div className="relative p-4 pt-20">
        <img src={repmate} alt="" className="h-44 -mt-8 -ml-8" />

        <p className="text-xs -mt-6 text-zinc-200">
          RepMate helps you find the right gym partner based on your goals, schedule, and training style. Whether you're new to fitness or a seasoned lifter, connect with people who keep you motivated and make every session count.
        </p>


        

        <div className="w-full h-[550px] p-2 mt-4 rounded-lg bg-zinc-800 bg-opacity-50 relative">
            <SwipeInstructions />
          {currentProfile ? (
            <GymBuddyCard profile={currentProfile} onSwipe={handleSwipe} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              No more profiles. Come back later!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GymBuddyFinder;
