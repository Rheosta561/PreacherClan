import React from 'react';

function JoinClanCard({ gym }) {
  return (
    <div className="text-white h-full w-full relative">
      <img
        src={gym.image? gym.image : ""}
        alt=""
        className="relative h-full w-full object-cover rounded-lg"
      />
      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div>

      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="w-full flex justify-between items-start">
          <div className="text-sm font-medium text-green-400">{gym.rating} ★</div>
          <div className="flex flex-col items-end text-right">
            <span>Certified</span>
            <p className="text-xs underline cursor-pointer">Learn More</p>
          </div>
        </div>

        <div className="text-xl font-semibold">
          {gym.name}
          <p className="text-xs font-medium text-zinc-200">
            {gym.location}, India
          </p>
          <p className="text-xs font-medium text-zinc-200">
            {gym.phone ? gym.phone : '+917303036689'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default JoinClanCard;
