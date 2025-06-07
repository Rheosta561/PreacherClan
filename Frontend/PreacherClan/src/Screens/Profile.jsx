import React from "react";
import { Pencil } from "lucide-react";
import MileStoneCard from "../Components/MileStoneCard";
import UserGoalCard from "../Components/UserGoalCard";
import GymCard from "../Components/GymCard";
import RepMateCard from "../Components/RepMateCard";
import RepMate from "../assets/RepMate.png";
import BottomRow from "../Components/bottomRow";
function Profile() {
    const mockUser = {
  name: "Aarav Mehta",
  age: 27,
  location: "Mumbai, India",
  profileImage: "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60",
  coverImage: "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&auto=format&fit=crop&q=60",
  preacherScore: 1480,
  preacherRank: "Warlord",
  goal: "Strength & Hypertrophy",
  gymTime: "Gold’s Gym, 6AM",
  tags: ["Push/Pull", "Deadlifts", "Consistency", "Mobility"],
  socials: {
    instagram: "@aarav_strength",
    twitter: "@aarav_lifts"
  },
  milestones: [
    { title: "Workout Streak", value: 26, description: "Days active this month" },
    { title: "PRs Set", value: 4, description: "New personal records" },
    { title: "Calories Burned", value: 32700, description: "Approximate this month" }
  ]
};
  return (
    <div className="bg-zinc-950 h w-screen text-white pt-20">
      <BottomRow/>
      <div className="h-52 w-full  relative ">
        <img
          src="https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8YmFjayUyMHdvcmtvdXR8ZW58MHx8MHx8fDA%3D"
          className="relative h-full w-full object-cover brightness-75"
          alt=""
        />
        <div className="absolute inset-0 h-full w-full  ">
          <div className="absolute inset-0 top-0 right-0  flex flex-row-reverse ">
            <div className="h-10 w-10  p-2">
              <button>
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-16 w-fit absolute p-2 inset-0 bottom-0   ">
            <div className="h-full w-full  rounded-full text-2xl font-semibold">
              78
              <p className="text-xs font-">Preacher Rank</p>
            </div>
          </div>
          <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-zinc-950 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 p-4 flex items-center gap-4">
            <div className="h-32 w-32 bg-zinc-800 rounded-full">
              <img
                src="https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFjayUyMHdvcmtvdXR8ZW58MHx8MHx8fDA%3D"
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-xl font-semibold">John Doe</p>
              <p className="text-sm text-zinc-300">Delhi, India</p>

              <p className="text-sm text-zinc-200"> Pack Physique</p>
            </div>
          </div>
        </div>
      </div>

      <div className=" w-full  p-2">
        <div className="h-fit w-full bg-opacity-95 rounded-lg p-4">
          <div className="flex w-full justify-between">
            <p className="text-2xl">Socials</p>
            <button className="text-zinc-300 text-sm">Edit</button>
          </div>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 ">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
                alt="Instagram"
                className="h-6 w-6 object-contain"
              />
              <p className="text-zinc-200">Instagram: @john_doe</p>
            </div>

            <div className="flex items-center gap-2">
              <img
                src="https://cdn.iconscout.com/icon/free/png-512/free-twitter-logo-icon-download-in-svg-png-gif-file-formats--social-media-major-websites-set-pack-logos-icons-461839.png?f=webp&w=512"
                alt="Twitter (X)"
                className="h-6 w-6 object-contain"
              />
              <p className="text-zinc-200">Twitter: @john_doe</p>
            </div>
          </div>
          <br />
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
  <MileStoneCard />
  <UserGoalCard user={mockUser} />
  <GymCard/>
</div>
         
        </div>
      </div>

      <div className="w-full p-2">
        <div>
            <img src={RepMate} alt="" className="h-28 -mt-8 -ml-4 -mb-8" />
            <p className="text-xs ml-4 mt-2 font-semibold">Your Gym Buddies</p>

        </div>
      
        <div className="h-fit p-4 flex w-full bg-opacity-95 rounded-lg ">
            <div className="flex flex-col gap-4 w-full">
              <RepMateCard
  name="Jane Smith"
  location="Mumbai, India"
  image="https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60"
/>
              <RepMateCard
  name="Jane Smith"
  location="Mumbai, India"
  image="https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60"
/>
                </div>
            

          </div>

      </div>
    </div>
  );
}

export default Profile;
