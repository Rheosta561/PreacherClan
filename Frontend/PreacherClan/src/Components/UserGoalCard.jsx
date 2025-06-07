import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';

const UserGoalCard = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState(user.goal);
  const [tags, setTags] = useState(user.tags);

  const handleTagRemove = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const newTag = e.target.newTag.value.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      e.target.reset();
    }
  };

  return (
    <div className="bg-zinc-900 bg-opacity-45 rounded-lg p-6 text-white w-full shadow-lg max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fitness Focus</h2>
        <button
          className="hover:text-red-400 transition"
          onClick={() => setIsEditing(!isEditing)}
          title="Edit goal and tags"
        >
          <Pencil className="w-5 h-5" />
        </button>
      </div>

      {/* Goal */}
      <div className="mb-4">
        <p className="text-sm text-zinc-400 uppercase mb-1">Goal</p>
        <p className="text-lg font-medium text-zinc-100">{goal}</p>
      </div>

      {/* Tags */}
      <div>
        <p className="text-sm text-zinc-400 uppercase mb-1">Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="bg-zinc-800 px-3 py-1 text-sm rounded-full flex items-center gap-2"
            >
              {tag}
              {isEditing && (
                <button
                  className="text-zinc-400 hover:text-red-500 transition"
                  onClick={() => handleTagRemove(i)}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <form className="mt-4 space-y-4" onSubmit={handleAddTag}>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Update Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Add Tag</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="newTag"
                placeholder="e.g., Squats"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:border-red-500"
              />
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserGoalCard;
