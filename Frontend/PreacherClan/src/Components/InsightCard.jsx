import React from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

const InsightCard = ({ title, insight, footer, imageUrl, imageAlt }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-zinc-950 border border-zinc-900 rounded-xl shadow-lg max-w-md text-white overflow-hidden"
    >
      {/* Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={imageAlt || "Insight Image"}
          className="w-full h-48 object-cover"
        />
      )}

      <div className="p-6 relative">
        {/* Icon */}
        <Lightbulb className="absolute top-6 right-6 w-6 h-6 text-amber-400 opacity-80" />

        <h3 className="text-2xl font-semibold mb-3">{title}</h3>
        <p className="text-zinc-300 mb-5 leading-relaxed">{insight}</p>

        {footer && (
          <div className="text-sm text-zinc-400 italic border-t border-zinc-700 pt-2">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InsightCard;
