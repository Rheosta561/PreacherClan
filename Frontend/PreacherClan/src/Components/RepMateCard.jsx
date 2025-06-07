import React, { useState } from "react";
import { MoreVertical, MessageCircle, BellRing, UserX } from "lucide-react";

function RepMateCard({ name, location, image }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-row-reverse items-center justify-between gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
      {/* Dots Icon */}
      <div className="relative">
        <button onClick={() => setOpen(!open)}>
          <MoreVertical className="h-5 w-5 text-zinc-400 hover:text-white" />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-8 z-10 w-40 bg-zinc-800 text-sm rounded-md shadow-lg border border-zinc-700">
            <button className="w-full flex items-center px-3 py-2 hover:bg-zinc-700 text-left" onClick={() => alert("Chat started")}>
              <MessageCircle className="w-4 h-4 mr-2" /> Chat
            </button>
            <button className="w-full flex items-center px-3 py-2 hover:bg-zinc-700 text-left" onClick={() => alert("Reminder sent")}>
              <BellRing className="w-4 h-4 mr-2" /> Remind
            </button>
            <button className="w-full flex items-center px-3 py-2 hover:bg-zinc-700 text-left text-red-400" onClick={() => alert("Unfriended")}>
              <UserX className="w-4 h-4 mr-2" /> Unfriend
            </button>
          </div>
        )}
      </div>

      {/* RepMate Info */}
      <div className="flex items-center gap-4">
        <img src={image} alt={name} className="h-14 w-14 rounded-full object-cover" />
        <div>
          <p className="text-base font-semibold text-white">{name}</p>
          <p className="text-sm text-zinc-400">{location}</p>
        </div>
      </div>
    </div>
  );
}

export default RepMateCard;
