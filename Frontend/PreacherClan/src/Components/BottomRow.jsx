import React, { useState, useEffect } from "react";
import { Home, Search, Dumbbell, SquarePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BottomRow() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const [isClanDisabled, setIsClanDisabled] = useState(false); // default false

  useEffect(() => {
    // Safe check: if no user?.gym → disable Clan
    if (!user?.gym) {
      setIsClanDisabled(true);
    } else {
      setIsClanDisabled(false);
    }
  }, [user]);

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full px-4 sm:px-0 sm:max-w-md">
      <div className="flex justify-around items-center py-3 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-md">
        <NavItem icon={<Home size={22} />} label="Home" navigate={navigate} to="/dashboard" />
        <NavItem icon={<Search size={22} />} label="Search" navigate={navigate} to="/search" />
        <NavItem
          icon={<Dumbbell size={22} />}
          label="Clan"
          navigate={navigate}
          to={`/clan/${user?._id || "unknown"}`}
          disabled={isClanDisabled}
          disabledTooltip="Join a Clan"
        />
        <NavItem icon={<SquarePlus size={22} />} label="Buddy" navigate={navigate} to="/gym/buddy/finder" />
      </div>
    </div>
  );
}

const NavItem = ({ icon, label, to, navigate, disabled = false, disabledTooltip = "" }) => (
  <button
    className={`relative flex flex-col items-center transition-colors group md:py-2 ${
      disabled ? "text-zinc-500 cursor-not-allowed" : "text-zinc-300 hover:text-white"
    }`}
    onClick={() => {
      if (!disabled) navigate(to);
    }}
  >
    {icon}
    <span className="text-[10px] mt-1 sm:text-xs md:hidden">{label}</span>

    {/* Main tooltip */}
    <span className="absolute bottom-full mb-2 hidden rounded bg-zinc-900 px-2 py-1 text-xs text-white whitespace-nowrap group-hover:block">
      {disabled ? disabledTooltip : label}
    </span>
  </button>
);

export default BottomRow;
