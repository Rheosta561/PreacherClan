import React from 'react';

const Features = ({ 
  imageSrc = 'https://via.placeholder.com/400x250', 
  title = 'Feature Title', 
  description = 'This is a description of the feature.', 
  onButtonClick = () => alert('Feature coming soon!') 
}) => {
  return (
    <div className="max-w-md w-96 mx-auto bg-zinc-950 border border-zinc-900 rounded-lg shadow-md overflow-hidden">
      <img 
        src={imageSrc} 
        alt={title} 
        className="w-full h-64 object-cover"
      />
      <div className="p-4">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-700 mb-4">{description}</p>
        <button
          onClick={onButtonClick}
          className="bg-zinc-50 hover:bg-zinc-900 w-full text-zinc-950 hover:text-zinc-50 font-semibold py-2 px-4 rounded transition"
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
};

export default Features;
