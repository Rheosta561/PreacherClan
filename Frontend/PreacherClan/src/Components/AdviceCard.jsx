import React from "react";
import { Lightbulb } from "lucide-react";

function AdviceCard({ title, tip, videoUrl }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-md overflow-hidden w-[380px] max-w-lg">
      <div className="p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="text-yellow-400 w-5 h-5" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <p className="text-zinc-300 text-sm mb-4">{tip}</p>
      </div>

      <div className="aspect-video w-full">
        <iframe
          src={videoUrl}
          title="Gym Tip Video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default AdviceCard;
