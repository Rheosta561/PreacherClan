import React from "react";

function PromoCard({
  title,
  shortDesc,
  longDesc = "",
  image,
  overlayOpacity = 0.75,
  className = "",
}) {
  return (
    <div className={`text-white relative min-h-72 w-full rounded-lg overflow-hidden ${className}`}>
      {/* Background Image with overlay */}
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: `brightness(${overlayOpacity})` }}
      />
      
      <div className="relative h-full p-4 md:p-6 flex flex-col gap-16 bg-black bg-opacity-30">
        <div>
          <h2 className="text-xl md:text-3xl font-bold">{title}</h2>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-zinc-300 max-w-md">
            {shortDesc}
          </p>
        </div>

        <p className="text-[10px] md:text-xs text-zinc-400 opacity-80 max-w-md transition-opacity duration-300 hover:opacity-100">
          {longDesc}
        </p>
      </div>
    </div>
  );
}

export default PromoCard;
