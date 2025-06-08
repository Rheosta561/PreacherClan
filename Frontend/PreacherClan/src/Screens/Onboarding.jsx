import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ImageIcon,
  User,
  Target,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
    const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [about, setAbout] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [youtube, setYoutube] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState([]);
  const [ambition, setAmbition] = useState([]);
  const [exerciseGenre, setExerciseGenre] = useState([]);
  const [userId, setUserId] = useState("");

  const fitnessGoalOptions = ["Lose Weight", "Build Muscle", "Improve Stamina"];
  const ambitionOptions = ["Compete", "Stay Fit", "Socialize"];
  const exerciseGenreOptions = ["Cardio", "Weight Training"];
  const totalSteps = 4;

  useEffect(() => {
    const user = localStorage.getItem("user");
    console.log("User from localStorage:", user);
    if (!user) {
      toast.error("You must be logged in to create a profile");
      return;
    }
    const userId = JSON.parse(user)._id;
    if (!userId) {
      toast.error("User ID not found");
      return;
    }
    setUserId(userId);
    if (profileImage) {
      const objectUrl = URL.createObjectURL(profileImage);
      setProfileImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [profileImage]);

  useEffect(() => {
    if (coverImage) {
      const objectUrl = URL.createObjectURL(coverImage);
      setCoverImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [coverImage]);

  const toggleSelect = (value, list, setList) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      if (profileImage) formData.append("profileImage", profileImage);
      if (coverImage) formData.append("coverImage", coverImage); // Your backend expects "image" for cover

      formData.append("about", about);
      formData.append("instagram", instagram);
      formData.append("twitter", twitter);
      formData.append("facebook", facebook);
      formData.append("youtube", youtube);
      formData.append("fitnessGoals", JSON.stringify(fitnessGoals));
      formData.append("ambition", JSON.stringify(ambition));
      formData.append("exerciseGenre", JSON.stringify(exerciseGenre));

      const response = await fetch(`http://localhost:3000/profile/${userId}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create profile");
      console.log("Profile created:", data);

      localStorage.setItem("profile", JSON.stringify(data.profile));
      toast.success("Profile created successfully!");
      navigate("/dashboard"); 
      
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Something went wrong");
    }
  };

  return (
    <div className="mx-auto p-8 pt-40 h-screen bg-zinc-950 text-white shadow-lg pt-20">
      <h2 className="text-3xl font-bold mb-6">Create Your Profile</h2>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-900 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* STEP 1: Image Uploads */}
      {step === 1 && (
        <div>
          <label className="block mb-2 font-semibold flex items-center gap-2">
            <ImageIcon size={20} /> Profile Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
            className="mb-2"
          />
          {profileImagePreview && (
            <img
              src={profileImagePreview}
              className="mb-4 h-24 w-24 object-cover rounded-full border border-green-500"
              alt="Preview"
            />
          )}

          <label className="block mb-2 font-semibold flex items-center gap-2">
            <ImageIcon size={20} /> Cover Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
            className="mb-2"
          />
          {coverImagePreview && (
            <img
              src={coverImagePreview}
              className="mb-4 h-24 w-full object-cover rounded border border-green-500"
              alt="Preview"
            />
          )}
        </div>
      )}

      {/* STEP 2: About */}
      {step === 2 && (
        <div>
          <label className="block mb-2 font-semibold flex items-center gap-2">
            <User size={20} /> About You
          </label>
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="w-full rounded p-2 bg-zinc-900 border border-zinc-700 text-white"
            placeholder="Write something about yourself"
          />
        </div>
      )}

      {/* STEP 3: Social Handles */}
      {step === 3 && (
        <div>
          <div className="flex space-x-4 mb-2">
            <Instagram size={20} />
            <Twitter size={20} />
            <Facebook size={20} />
            <Youtube size={20} />
            <span className="font-semibold ml-2">Social Handles (optional)</span>
          </div>
          {[{ label: "Instagram", value: instagram, setter: setInstagram },
            { label: "Twitter", value: twitter, setter: setTwitter },
            { label: "Facebook", value: facebook, setter: setFacebook },
            { label: "Youtube", value: youtube, setter: setYoutube }].map(({ label, value, setter }) => (
            <input
              key={label}
              type="text"
              placeholder={label}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full mb-2 rounded p-2 bg-zinc-950 border border-zinc-700 text-white"
            />
          ))}
        </div>
      )}

      {/* STEP 4: Goals */}
      {step === 4 && (
        <div>
          {[{ title: "Fitness Goals", options: fitnessGoalOptions, state: fitnessGoals, setter: setFitnessGoals },
            { title: "Ambition", options: ambitionOptions, state: ambition, setter: setAmbition },
            { title: "Exercise Genre", options: exerciseGenreOptions, state: exerciseGenre, setter: setExerciseGenre }]
            .map(({ title, options, state, setter }) => (
              <div key={title}>
                <label className="block mb-2 font-semibold">{title}</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleSelect(option, state, setter)}
                      className={`px-4 py-2 rounded ${
                        state.includes(option)
                          ? "bg-green-950"
                          : "bg-zinc-950 border-zinc-800 border hover:bg-zinc-600"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-4 py-2 rounded bg-zinc-900 font-semibold hover:bg-zinc-600"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <div />
        )}

        {step < totalSteps ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded bg-green-950 font-semibold hover:bg-green-700"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1 px-4 py-2 rounded bg-green-950 hover:bg-green-800"
          >
            <CheckCircle size={16} /> Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
