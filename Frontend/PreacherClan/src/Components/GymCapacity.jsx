import React, { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { Dumbbell } from "lucide-react";
import "react-circular-progressbar/dist/styles.css";

const GymCapacity = ({ day, date, preachersCount, capacityPercent, maxCapacity }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; // animation duration in ms
    const increment = capacityPercent / (duration / 16); // approx 60fps

    function animate() {
      start += increment;
      if (start >= capacityPercent) {
        setProgress(capacityPercent);
      } else {
        setProgress(start);
        requestAnimationFrame(animate);
      }
    }

    animate();
  }, [capacityPercent]);

  const currentCapacity = Math.round((progress / 100) * maxCapacity);

  const getColor = (percent) => {
    if (percent < 50) return "#10B981"; // green
    if (percent < 80) return "#FBBF24"; // yellow
    return "#EF4444"; // red
  };

  return (
    <div className="flex justify-end gap-8 flex-row-reverse items-center bg-zinc-950 border border-zinc-900 p-6 rounded-lg max-w-md text-white">
      <div className="flex flex-col space-y-1">
        <span className="text-5xl font-semibold uppercase text-zinc-50">{day}</span>
        <span className="text-xl font-semibold">{date}</span>
        <span className="text-xs text-zinc-300">
          {preachersCount} preacher{preachersCount !== 1 ? "s" : ""} working out right now
        </span>
      </div>

      <div className="w-44">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="text-emerald-500 w-5 h-5" />
          <span className="text-lg font-semibold">Gym Capacity</span>
        </div>

        <CircularProgressbar
          value={progress}
          text={`${Math.round(progress)}%`}
          styles={buildStyles({
            textColor: "white",
            pathColor: getColor(progress),
            trailColor: "#374151",
            pathTransitionDuration: 0.15,
          })}
        />
        <div className="text-center mt-2 text-xs text-zinc-400">
          {currentCapacity} of {maxCapacity} spots filled
        </div>
        <div className="text-center mt-1 text-xs text-zinc-500 italic">
          Updated 5 minutes ago
        </div>
      </div>
    </div>
  );
};

export default GymCapacity;
