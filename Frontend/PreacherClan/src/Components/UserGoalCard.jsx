import React, { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';

const UserGoalCard = ({
  fitnessGoals = [],
  exerciseGenre = [],
  onUpdateFitnessGoals,
  onUpdateExerciseGenre,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const [fitnessGoalTags, setFitnessGoalTags] = useState([]);
  const [exerciseGenreTags, setExerciseGenreTags] = useState([]);

  // Controlled input states for add forms
  const [newFitnessGoal, setNewFitnessGoal] = useState('');
  const [newExerciseGenre, setNewExerciseGenre] = useState('');

  useEffect(() => {
    setFitnessGoalTags(Array.isArray(fitnessGoals) ? fitnessGoals : []);
  }, [fitnessGoals]);

  useEffect(() => {
    setExerciseGenreTags(Array.isArray(exerciseGenre) ? exerciseGenre : []);
  }, [exerciseGenre]);

  const handleRemoveTag = (index, type) => {
    if (type === 'fitnessGoals') {
      setFitnessGoalTags(prev => prev.filter((_, i) => i !== index));
    } else {
      setExerciseGenreTags(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddFitnessGoal = (e) => {
    e.preventDefault();
    const tag = newFitnessGoal.trim();
    if (!tag) return;
    if (!fitnessGoalTags.includes(tag)) {
      setFitnessGoalTags(prev => [...prev, tag]);
    }
    setNewFitnessGoal('');
  };

  const handleAddExerciseGenre = (e) => {
    e.preventDefault();
    const tag = newExerciseGenre.trim();
    if (!tag) return;
    if (!exerciseGenreTags.includes(tag)) {
      setExerciseGenreTags(prev => [...prev, tag]);
    }
    setNewExerciseGenre('');
  };

  const handleSave = () => {
    setIsEditing(false);
    onUpdateFitnessGoals?.(fitnessGoalTags);
    onUpdateExerciseGenre?.(exerciseGenreTags);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFitnessGoalTags(Array.isArray(fitnessGoals) ? fitnessGoals : []);
    setExerciseGenreTags(Array.isArray(exerciseGenre) ? exerciseGenre : []);
    setNewFitnessGoal('');
    setNewExerciseGenre('');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 bg-opacity-45 rounded-lg p-6 text-white w-full shadow-lg max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Fitness Goals & Exercise Genres</h2>
        <button
          className="hover:text-red-400 transition"
          onClick={() => setIsEditing(true)}
          title="Edit goals and exercise genres"
        >
          <Pencil className="w-5 h-5" />
        </button>
      </div>

      {/* Fitness Goals */}
      <div className="mb-4">
        <p className="text-sm text-zinc-400 uppercase mb-1">Fitness Goals</p>
        {fitnessGoalTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {fitnessGoalTags.map((tag, i) => (
              <span
                key={i}
                className="bg-zinc-800 px-3 py-1 text-sm rounded-full flex items-center gap-2"
              >
                {tag}
                {isEditing && (
                  <button
                    className="text-zinc-400 hover:text-red-500 transition"
                    onClick={() => handleRemoveTag(i, 'fitnessGoals')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 italic">No fitness goals set</p>
        )}
      </div>

      {/* Exercise Genres */}
      <div>
        <p className="text-sm text-zinc-400 uppercase mb-1">Exercise Genres</p>
        {exerciseGenreTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {exerciseGenreTags.map((tag, i) => (
              <span
                key={i}
                className="bg-zinc-800 px-3 py-1 text-sm rounded-full flex items-center gap-2"
              >
                {tag}
                {isEditing && (
                  <button
                    className="text-zinc-400 hover:text-red-500 transition"
                    onClick={() => handleRemoveTag(i, 'exerciseGenre')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 italic">No exercise genres added</p>
        )}
      </div>

      {/* Edit Forms */}
      {isEditing && (
        <>
          <form className="mt-4 space-y-4" onSubmit={handleAddFitnessGoal}>
            <label className="block text-sm text-zinc-400 mb-1">Add Fitness Goal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFitnessGoal}
                onChange={e => setNewFitnessGoal(e.target.value)}
                placeholder="e.g., Lose weight"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring focus:border-red-500"
              />
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-medium"
              >
                Add
              </button>
            </div>
          </form>

          <form className="mt-4 space-y-4" onSubmit={handleAddExerciseGenre}>
            <label className="block text-sm text-zinc-400 mb-1">Add Exercise Genre</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExerciseGenre}
                onChange={e => setNewExerciseGenre(e.target.value)}
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
          </form>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleSave}
              className="bg-green-900 hover:bg-green-950 px-4 py-2 rounded text-sm font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-zinc-900 hover:bg-zinc-950 border border-zinc-800 px-4 py-2 rounded text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserGoalCard;
