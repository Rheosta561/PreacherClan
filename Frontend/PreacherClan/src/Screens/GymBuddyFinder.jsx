import React, { useState } from "react";
import BottomRow from "../Components/BottomRow";
import repmate from "../assets/repmate.png";
import GymBuddyCard from "../Components/GymBuddyCard";
import SwipeInstructions from "../Components/SwipeInstructions";
import { Toaster , toast } from "sonner";
import { Navbar } from "@heroui/react";
// import VikingToaster from "../Components/VikingToaster"
import repmateKing from "../assets/repmateKing.png";
import RepMateCardRequest from "../Components/RepMateRequestCard";
import { useRef } from "react";
import { useEffect } from "react";
import MatchListener from "../Components/MatchListener";
import { useNavigate } from "react-router-dom"
import axios from "axios";

const dummyRequests = [
  {
    id: 1,
    image: repmateKing,
    name: "Repmate king",
    role: "Software Engineer",
    company: "TechCorp",
    tags: ["javascript", "react", "nodejs"],
    isVerified: true,
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1",
    name: "Jane Smith",
    role: "Product Manager",
    company: "Innovate Ltd.",
    tags: ["agile", "scrum", "leadership"],
    isVerified: false,
  },
];



function GymBuddyFinder() {
  const [requests, setRequests] = useState([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [profiles , setProfiles] = useState([]);
  const navigate = useNavigate();
  const [user, setUser] = useState()
  
  useEffect(() => {
    const fetchProfiles = async() =>{
      try {
        console.log("Fetching profiles...");
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        setUser(user);
        const response = await axios.get(`https://preacherclan.onrender.com/repmate/${user._id}`);
        console.log(response.data);
        if (response.data && response.data.profiles) {
          setProfiles(response.data.profiles);
        } else {
          console.error("No profiles found in response");
          toast.error("No profiles found. Please try again later.", {
            className: "bg-red-700 text-white border border-red-800 shadow-lg",
          });
        }
        
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Failed to fetch profiles. Please try again later.", {
          className: "bg-red-700 text-white border border-red-800 shadow-lg",
        });
        
        
      }
    }
    fetchProfiles();
  
    
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        const response = await axios.get(`https://preacherclan.onrender.com/requests/${user._id}`);
        console.log("Requests response:", response.data);
        if (response.data && response.data.requests) {
          setRequests(response.data.requests);
        } else {
          console.error("No requests found in response");
          toast.error("No requests found. Please try again later.", {
            className: "bg-red-700 text-white border border-red-800 shadow-lg",
          });
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to fetch requests. Please try again later.", {
          className: "bg-red-700 text-white border border-red-800 shadow-lg",
        });
      }
    };
    fetchRequests();
    
  
    
  }, [])
  

  





const currentUserId = JSON.parse(localStorage.getItem("user"))._id;

const involvedUserIds = new Set();
// Set of user IDs involved in requests

requests.forEach((request) => {
  const senderId = request.sender?.user?._id || request.sender?.userId;
  const receiverId = request.receiver?.user?._id || request.receiver?.userId;

  if (senderId) involvedUserIds.add(senderId.toString());
  if (receiverId) involvedUserIds.add(receiverId.toString());
});

const filteredProfiles = profiles.filter((profile) => {
  return (
    profile.userId.toString() !== currentUserId.toString() &&
    !involvedUserIds.has(profile.userId.toString())
  );
});

console.log("Current User ID:", currentUserId);
  console.log("Filtered Profiles:", filteredProfiles);

  const filteredRequests = requests.filter((request) => {
    return request.sender.user._id !== JSON.parse(localStorage.getItem("user"))._id && request.receiver.user._id === JSON.parse(localStorage.getItem("user"))._id;
  });


  
 
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  const CARD_WIDTH = 380; // approx 380px + padding/margin
  const totalPages = requests.length;

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const page = Math.round(scrollLeft / CARD_WIDTH);
      setCurrentPage(page);
    }
  };

  const showToast = () => {
    setToastVisible(true);
  };
  const [index, setIndex] = useState(0);


const handleSwipe = async(direction) => {
  const profile = filteredProfiles[index];
  if (!profile) return;
  

  console.log(`Swiped ${direction} on ${profile.name}`);

  if (direction === "left") {
    setIndex((prev) => prev + 1);
    const response = await  axios.post(`https://preacherclan.onrender.com/requests/send/${user._id}/${profile.userId}`, )
    
    console.log("Request sent to server:", response);
    toast("🪓 Request Sent!", {
      description: `Your message sails to ${profile.name}'s village.`,
      className: "bg-zinc-900 text-white border border-red-800 shadow-lg ",
    });
  } else if (direction === "right") {
    setIndex((prev) => prev + 1);
    toast.error("💀 Rejected", {
      description: `${profile.name} was not chosen for your raid.`,
      className: "bg-zinc-900 text-white border border-zinc-700 shadow-lg ",
    });
  }

  setIndex((prev) => prev + 1);
};
  // useEffect(() => {
  //   const fetchProfiles = async() =>{
  //     try {
  //       console.log("Fetching profiles...");
  //       const user = JSON.parse(localStorage.getItem("user"));
  //       if (!user) {
  //         navigate("/login");
  //         return;
  //       }
  //       const response = await axios.get(`https://preacherclan.onrender.com/repmate`);
  //       console.log(response.data);
  //       if (response.data && response.data.profiles) {
  //         setProfiles(response.data.profiles);
  //       } else {
  //         console.error("No profiles found in response");
  //         toast.error("No profiles found. Please try again later.", {
  //           className: "bg-red-700 text-white border border-red-800 shadow-lg",
  //         });
  //       }
        
  //     } catch (error) {
  //       console.error("Error fetching profiles:", error);
  //       toast.error("Failed to fetch profiles. Please try again later.", {
  //         className: "bg-red-700 text-white border border-red-800 shadow-lg",
  //       });
        
        
  //     }
  //   }
  //   fetchProfiles();
  
    
  // }, []);
  filteredProfiles.sort(()=> Math.random() - 0.5); 
  
  const handleAccept = async (requestId) => {
  try {
    const response = await axios.post(`https://preacherclan.onrender.com/requests/${user._id}/${requestId}`);
    console.log("Accept response:", response.data);     
    if (response.status === 200) {
      toast.success("Request accepted!", {
        className: "bg-green-700 text-white border border-green-800 shadow-lg",
      });
      setRequests((prev) => prev.filter((req) => req._id !== requestId));
      localStorage.setItem('user' , response.data.user);
      
    } else {
      toast.error("Failed to accept request. Please try again.", {
        className: "bg-red-700 text-white border border-red-800 shadow-lg",
      });
    }
  } catch (error) {
    console.error("Error accepting request:", error);
    toast.error("Failed to accept request. Please try again.", {
      className: "bg-red-700 text-white border border-red-800 shadow-lg",
    });
  }
};


  const currentProfile = filteredProfiles[index];
  console.log("Current Profile:", currentProfile);

  return (
    <div className=" w-screen relative text-white bg-zinc-950">
      <BottomRow />
      <Navbar/>

      <div className="relative p-4 pt-20">
        <img src={repmate} alt="" className="h-44 -mt-8 -ml-8" />

        <p className="text-xs -mt-6 text-zinc-200">
          RepMate helps you find the right gym partner based on your goals, schedule, and training style. Whether you're new to fitness or a seasoned lifter, connect with people who keep you motivated and make every session count.
        </p>


        

        <div className="w-full h-[550px] p-2 mt-4 rounded-lg bg-zinc-800 bg-opacity-50 relative">
            <SwipeInstructions />
          {currentProfile ? (
            <GymBuddyCard profile={currentProfile} onSwipe={handleSwipe} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              No more profiles. Come back later!
            </div>
          )}
        </div>
      </div>
      <button
onClick={showToast}
  className="p-2 bg-red-700 opacity-0 text-white rounded-lg shadow hover:bg-red-800"
>
  Summon Viking Toast
</button>
<VikingToaster
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        message="A brother-in-arms sends his regards!"
      />
      
      

     <div className="m-4 border border-zinc-800 rounded-lg p-2 bg-zinc-900 bg-opacity-50">
      <h2 className="text-sm ml-2 text-zinc-50  mb-2">Pending Requests</h2>
      <div
        className="border p-2 rounded-lg bg-zinc-950 flex border-zinc-800 items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {filteredRequests.length === 0 && (
          <div className="text-zinc-400 text-sm">No Requests at the moment.</div>
        )}
        {filteredRequests.map((request ) => (
          <RepMateCardRequest
            key={request._id}
            request={request.sender  }
            profile = {request.sender.profile}
            onAccept={() => handleAccept(request._id)}
            onReject={() => handleReject(request._id)}
          />
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center mt-2 gap-2">
        {Array.from({ length: totalPages }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentPage
                ? "bg-zinc-50 scale-125"
                : "bg-zinc-500 opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
    <MatchListener/>

      <br />
      <br />
      <br />
    </div>
  );
}

export default GymBuddyFinder;
