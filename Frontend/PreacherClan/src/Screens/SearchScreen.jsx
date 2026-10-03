import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import ProfileCard from "../Components/ProfileCard"; // make sure this path is correct
import GymInfoCard from "../Components/GymInfoCard"; // make sure this path is correct
import BottomRow from "../Components/bottomRow";

const mockGyms = [
  {
    type: "gym",
    name: "Iron Temple",
    city: "Delhi",
    country: "India",
    image: "https://images.unsplash.com/photo-1550345332-09e3ac987658",
    location: "Delhi, India",
    distance: "2km away",
    trainers: 8,
    equipments: ["Barbell", "Squat Rack", "Treadmill"],
    fees: 2000,
    rating: 4.8,
    featured: true
  },
  {
    type: "gym",
    name: "Beast Mode Gym",
    city: "Mumbai",
    country: "India",
    image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba",
    location: "Mumbai, India",
    distance: "5km away",
    trainers: 5,
    equipments: ["Kettlebell", "Rowing Machine", "Bench Press"],
    fees: 1800,
    rating: 4.5,
    featured: false
  },
  {
    type: "gym",
    name: "Warrior Forge",
    city: "Bangalore",
    country: "India",
    image: "https://images.unsplash.com/photo-1638326/pexels-photo-1638326.jpeg",
    location: "Bangalore, India",
    distance: "3.5km away",
    trainers: 6,
    equipments: ["Dumbbells", "Pull-Up Bar", "Spin Bike"],
    fees: 1600,
    rating: 4.7,
    featured: true
  }
];

const mockUsers = [
  {
    type: "user",
    name: "Aarav Singh",
    age: 28,
    goal: "Muscle Gain",
    time: "Morning",
    tags: ["motivated", "early riser"],
    preacherRank: "Gold",
    isVerified: true,
    city: "Delhi",
    image: "https://randomuser.me/api/portraits/men/11.jpg"
  },
  {
    type: "user",
    name: "Jane Doe",
    age: 25,
    goal: "Weight Loss",
    time: "Evening",
    tags: ["consistent", "yoga lover"],
    preacherRank: "Silver",
    isVerified: false,
    city: "Mumbai",
    image: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    type: "user",
    name: "Rohit Sharma",
    age: 31,
    goal: "Strength Training",
    time: "Afternoon",
    tags: ["disciplined", "intense"],
    preacherRank: "Bronze",
    isVerified: true,
    city: "Bangalore",
    image: "https://randomuser.me/api/portraits/men/32.jpg"
  }
];

const SearchScreen = () => {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const results = [...mockGyms, ...mockUsers].filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.city.toLowerCase().includes(query.toLowerCase()) ||
    (item.goal?.toLowerCase().includes(query.toLowerCase()) ?? false)
  );

  const showResults = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pt-20 space-y-6 relative">
      {/* Search Input */}
      
      <div className="sticky top-0 z-20 bg-zinc-950">
        <div className="relative w-full">
          <Search className="absolute left-3 top-3 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search gyms or users..."
            className="w-full pl-10 p-3 rounded-md bg-zinc-800 text-sm outline-none text-white placeholder:text-zinc-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <BottomRow/>

      {/* Unified Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 z-50"
          >
            {results.length > 0 ? (
              results.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex gap-3 items-center bg-zinc-950 border border-zinc-900 shadow-white shadow-medium p-3 rounded-lg cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className={`w-16 h-16 object-cover ${item.type === "user" ? "rounded-full" : "rounded-md"}`}
                  />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-400">
                      {item.type === "gym"
                        ? `${item.city}, ${item.country}`
                        : `${item.goal} — ${item.city}`}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No results found.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Popup */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center"
            onClick={() => setSelectedItem(null)}
          >
            <div onClick={(e) => e.stopPropagation()} className="relative">
              {selectedItem.type === "user" ? (
                <ProfileCard
                  profile={{
                    name: selectedItem.name,
                    image: selectedItem.image,
                    age: selectedItem.age || 25,
                    goal: selectedItem.goal || "General Fitness",
                    time: selectedItem.time || "Morning",
                    tags: selectedItem.tags || [],
                    preacherRank: selectedItem.preacherRank || null,
                    isVerified: selectedItem.isVerified || false
                  }}
                  onRequest={() => alert(`Request sent to ${selectedItem.name}`)}
                />
              ) : (

                <GymInfoCard
  gym={{
    ...selectedItem,
    onJoin: () => alert(`Joined ${selectedItem.name}`)
  }}
/>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute -top-4 -right-4 text-white bg-zinc-800 p-2 rounded-full hover:bg-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchScreen;
