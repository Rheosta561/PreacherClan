import React from "react";
import { Dumbbell, User, Wallet2, MapPin, Star } from "lucide-react";

function GymInfoCard({ gym }) {
  const {
    name,
    image,
    location,
    distance = "12km away", // default distance text if none provided
    trainers,
    equipments,
    fees,
    rating,
    featured,
    onJoin,
  } = gym;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg w-[380px] max-w-md">
      <div className="relative">
        <img src={image} alt={name} className="h-40 w-full object-cover" />

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
            Featured
          </div>
        )}

        {/* Location */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-400" />
          <span>{location}</span>
        </div>

        {/* Distance */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
          {distance}
        </div>
      </div>

      <div className="p-5 text-white">
        <h2 className="text-2xl font-bold mb-4">{name}</h2>

        <div className="space-y-3 mb-5 text-sm">
          {/* Trainers */}
          <div className="flex items-center gap-3">
            <User className="text-blue-400 w-5 h-5" />
            <span className="text-zinc-300">
              Trainers: <span className="text-white font-medium">{trainers}</span>
            </span>
          </div>

          {/* Equipment Tags */}
          <div className="flex items-start gap-3">
            <Dumbbell className="text-green-400 w-5 h-5 mt-1" />
            <div className="flex flex-wrap gap-2">
              {equipments.map((item, index) => (
                <span
                  key={index}
                  className="bg-zinc-800 text-zinc-200 px-2 py-1 rounded text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Fees */}
          <div className="flex items-center gap-3">
            <Wallet2 className="text-yellow-400 w-5 h-5" />
            <span className="text-zinc-300">
              Monthly Fee: <span className="text-white font-medium">₹{fees}</span>
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-zinc-300 text-sm">
              Rating: <span className="text-white font-medium">{rating} / 5</span>
            </span>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={onJoin}
          className="w-full py-2 rounded-md bg-zinc-50 hover:bg-zinc-900 text-zinc-950 hover:text-white text-sm font-semibold transition"
        >
          Join Now
        </button>
      </div>
    </div>
  );
}

export default GymInfoCard; 