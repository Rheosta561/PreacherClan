import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import MileStoneCard from "../Components/MileStoneCard";
import UserGoalCard from "../Components/UserGoalCard";
import GymCard from "../Components/GymCard";
import RepMateCard from "../Components/RepMateCard";
import RepMate from "../assets/repmate.png";
import BottomRow from "../Components/BottomRow";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [ambition, setAmbition] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedProfile = localStorage.getItem("profile");

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUserId(parsedUser._id);
          setUser(parsedUser);
          console.log("Parsed user:", parsedUser);

          if (storedProfile && storedProfile !== "null") {
            const parsedProfile = JSON.parse(storedProfile);
            if (typeof parsedProfile === "object" && parsedProfile !== null) {
              setProfile(parsedProfile);
              setInstagram(parsedProfile?.socialHandles?.instagram || "");
              setTwitter(parsedProfile?.socialHandles?.twitter || "");
              setAmbition(parsedProfile?.ambition || "");
              
            }
          }

          // If profile is missing or invalid, fetch it
          const response = await fetch(`https://preacherclan.onrender.com/profile/${parsedUser._id}`);
          if (response.ok) {
            const profileData = await response.json();
            console.log("Fetched profile data:", profileData);
            setProfile(profileData);
            setInstagram(profileData?.socialHandles?.instagram || "");
            setTwitter(profileData?.socialHandles?.twitter || "");
            setAmbition(profileData?.ambition || "");
            localStorage.setItem("profile", JSON.stringify(profileData));
          } else {
            console.error("Failed to fetch profile");
            navigate('/onboarding');

          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        navigate('/onboarding');
      }
    };

    checkProfile();
  }, []);

  // Update ambition state if profile changes
  useEffect(() => {
    if (profile) {
      console.log("Profile updated:", profile);
      setAmbition(profile.ambition || "");
    }
  }, [profile]);

const handleSave = async () => {
  try {
    const formData = new FormData();
    formData.append("socialHandles[instagram]", instagram);
    formData.append("socialHandles[twitter]", twitter);
    formData.append("ambition", JSON.stringify(ambition));


    if (profileImageFile) formData.append("profileImage", profileImageFile);
    if (coverImageFile) formData.append("coverImage", coverImageFile);
    console.log(coverImageFile, profileImageFile);

    // Send fitnessGoals and exerciseGenre as JSON strings
    if (profile?.fitnessGoals) {
      formData.append("fitnessGoals", JSON.stringify(profile.fitnessGoals));
    }
    if (profile?.exerciseGenre) {
      formData.append("exerciseGenre", JSON.stringify(profile.exerciseGenre));
    }
    console.log("FormData:", formData);

    const response = await fetch(`https://preacherclan.onrender.com/profile/${userId}`, {
      method: "PUT",
      body: formData,
    });
    console.log(response);
    console.log(response.data);

    if (response.ok) {
      const result = await response.json();
      const updated = result.profile;
      setProfile(updated);
      localStorage.setItem("profile", JSON.stringify(updated));
      setIsEditing(false);
      setProfileImageFile(null);
      setCoverImageFile(null);
    } else {
      console.error("Failed to update profile");
    }
  } catch (error) {
    console.error("Update error:", error);
  }
};


  const handleCancel = () => {
    setInstagram(profile?.socialHandles?.instagram || "");
    setTwitter(profile?.socialHandles?.twitter || "");
    setAmbition(profile?.ambition || "");
    setProfileImageFile(null);
    setCoverImageFile(null);
    setIsEditing(false);
  };

  // Handlers to update fitnessGoals and exerciseGenre on profile state
  const handleUpdateFitnessGoals = (updatedFitnessGoals) => {
    setProfile((prev) => ({
      ...prev,
      fitnessGoals: updatedFitnessGoals,
    }));
  };

  const handleUpdateExerciseGenre = (updatedExerciseGenre) => {
    setProfile((prev) => ({
      ...prev,
      exerciseGenre: updatedExerciseGenre,
    }));
  };

  if (!profile || typeof profile !== "object") {
    return <div className="text-white p-8">Loading profile...</div>;
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-white pt-20">
      <BottomRow />
      {/* Cover Image */}
      <div className="h-52 w-full relative">
        <img
          src={
            coverImageFile
              ? URL.createObjectURL(coverImageFile)
              : profile?.coverImage ||
                "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800"
          }
          className="h-full w-full object-cover brightness-75 relative"
          alt="Cover"
        />
        <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-zinc-950 to-transparent">
          <div className="absolute top-2 right-2">
            {isEditing && (
              <label className="cursor-pointer">
                <Pencil className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="absolute top-4 left-4 p-2">
            <div className="text-2xl font-semibold">{user?.streak?.count || "100"}</div>
            <p className="text-xs">Preacher Rank</p>
          </div>
        </div>
        {/* Profile image */}
        <div className="relative left-0 right-0 flex items-center p-4 -mt-32">
          <div className="absolute bottom-[-1rem] left-4 h-32 w-32 rounded-full overflow-hidden  bg-zinc-800 flex">
            {isEditing ? (
              <label className="cursor-pointer block h-full w-full">
                <img
                  src={
                    profileImageFile
                      ? URL.createObjectURL(profileImageFile)
                      : profile?.profileImage ||
                        "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400"
                  }
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            ) : (
              <img
                src={
                  profile?.profileImage ||
                  "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400"
                }
                alt="Profile"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="ml-32 mt-8 px-4">
            {/* Add ml-40 to offset profile image */}
            <div className="text-xl font-semibold">{user?.name || "John Doe"}</div>
            <p className="text-sm text-zinc-300">{user?.location || "Delhi, India"}</p>
            {/* <p className="text-sm text-zinc-200">Pack Physique</p> */}
          </div>
        </div>
      </div>

      {/* Socials Section */}
      <div className="w-full px-4 mt-6">
        <div className="bg-zinc-900 border border-zinc-800  bg-opacity-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-2xl">Profile</p>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-sm text-zinc-300">
                Edit
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-2 text-sm">
            {isEditing ? (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
                    alt="Instagram"
                    className="h-6 w-6"
                  />
                  <input
                    type="text"
                    className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-1 flex-1"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src="https://cdn.iconscout.com/icon/free/png-512/free-twitter-logo-icon-download-in-svg-png-gif-file-formats--social-media-major-websites-set-pack-logos-icons-461839.png?f=webp&w=512"
                    alt="Twitter"
                    className="h-6 w-6"
                  />
                  <input
                    type="text"
                    className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-1 flex-1"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <label className="w-24 font-semibold">Ambition:</label>
                  <input
                    type="text"
                    className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-1 flex-1"
                    value={ambition}
                    onChange={(e) => setAmbition(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSave}
                    className="bg-green-900 px-4 py-1 rounded hover:bg-green-950"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-red-600 px-4 py-1 rounded hover:bg-red-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
                    alt="Instagram"
                    className="h-6 w-6"
                  />
                  <p className="text-zinc-200">Instagram: {instagram || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src="https://cdn.iconscout.com/icon/free/png-512/free-twitter-logo-icon-download-in-svg-png-gif-file-formats--social-media-major-websites-set-pack-logos-icons-461839.png?f=webp&w=512"
                    alt="Twitter"
                    className="h-6 w-6"
                  />
                  <p className="text-zinc-200">Twitter: {twitter || "N/A"}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="w-24 font-semibold">Ambition:</label>
                  <p className="text-zinc-200">{ambition || "N/A"}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Milestones, Goals, Gym Cards */}
      <div className="px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <MileStoneCard user={user}/>
        <UserGoalCard
          fitnessGoals={profile?.fitnessGoals || []}
          exerciseGenre={profile?.exerciseGenre || []}
          onUpdateFitnessGoals={handleUpdateFitnessGoals}
          onUpdateExerciseGenre={handleUpdateExerciseGenre}
          onUpdateAmbition={(updatedAmbition) => {
            setAmbition(updatedAmbition);
            setProfile((prev) => ({
              ...prev,
              ambition: updatedAmbition,
            }));
            console.log("Ambition updated:", updatedAmbition);
          }}
        />
        <GymCard />
      </div>

      {/* RepMates Section */}
      <div className="px-4 mt-8">
        <img src={RepMate} alt="RepMate" className="h-28 -mt-8 -ml-4 -mb-8" />
        <p className="text-xs ml-4 mt-2 font-semibold">Your Gym Buddies</p>
        <div className="p-4 bg-zinc-950 rounded-lg flex flex-col gap-4">
          {user?.partner?.length === 0 && (
            <p className="text-zinc-400 text-sm">You have no gym buddies yet. Start connecting!</p>
          )}
          {user.partner.map((mate)=>(
            <RepMateCard
              key={mate._id}
              receiverId = {mate._id}

              name={mate.name}
              location={mate.location}
              image={mate.profileImage || "https://img.freepik.com/free-vector/viking-warrior-with-raven_43623-950.jpg?uid=R156956613&ga=GA1.1.1904776371.1723148990&semt=ais_hybrid&w=740"}
            />
          ))}
          
        </div>
      </div>

      <br />
      <br />
      <br />
    </div>
  );
}

export default Profile;
