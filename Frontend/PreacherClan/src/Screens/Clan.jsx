import React, { useState, useRef, useEffect } from 'react';
import BottomRow from '../Components/bottomRow';
import { MapPin } from "lucide-react";
import GymCapacity from '../Components/GymCapacity';
import InsightCard from '../Components/InsightCard';
import ProfileCard from '../Components/ProfileCard';
import Features from '../Components/Features';

function Clan() {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const members = [
    { name: "Aarav Singh", age: 26, goal: "Build Muscle", time: "6:00 AM - 8:00 AM", tags: ["hypertrophy", "discipline", "early riser", "creatine"], image: "https://images.unsplash.com/photo-1676491167770-bce474fe0024?w=1200&auto=format&fit=crop&q=60", preacherRank: "Elite Preacher", isVerified: true },
    { name: "Jane Smith", age: 28, goal: "Weight Loss", time: "6:00 AM - 8:00 AM", tags: ["cardio", "HIIT", "dedicated", "healthy"], image: "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=1400&auto=format&fit=crop&q=60", preacherRank: "Elite Preacher", isVerified: true },
    { name: "Erik Thorvald", age: 30, goal: "Endurance", time: "7:00 AM - 9:00 AM", tags: ["long runs", "stamina", "battle ready", "focus"], image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=1200&auto=format&fit=crop&q=60", preacherRank: "Viking Warrior", isVerified: true },
    { name: "Freya Bjornsdottir", age: 27, goal: "Strength & Agility", time: "5:30 AM - 7:30 AM", tags: ["powerlifting", "agility drills", "discipline", "focus"], image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=60", preacherRank: "Shield Maiden", isVerified: true },
    { name: "Leif Magnusson", age: 32, goal: "Muscle Gain", time: "6:00 AM - 8:00 AM", tags: ["hypertrophy", "nutrition", "creatine", "discipline"], image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&auto=format&fit=crop&q=60", preacherRank: "Elite Preacher", isVerified: false },
    { name: "Astrid Helga", age: 25, goal: "Weight Loss", time: "6:30 AM - 8:30 AM", tags: ["HIIT", "cardio", "dedicated", "nutrition"], image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&auto=format&fit=crop&q=60", preacherRank: "Viking Runner", isVerified: true },
    { name: "Bjorn Ironside", age: 35, goal: "Powerlifting", time: "7:00 AM - 9:00 AM", tags: ["powerlifting", "strength", "discipline", "focus"], image: "https://images.unsplash.com/photo-1508214751195-bcfd4ca60f92?w=1200&auto=format&fit=crop&q=60", preacherRank: "Viking Warrior", isVerified: false },
  ];

  // Filter members by search term (case insensitive)
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Calculate pages based on filtered members and container width
    const updatePages = () => {
      const visibleWidth = container.offsetWidth;
      const totalScrollWidth = container.scrollWidth;
      const pages = Math.ceil(totalScrollWidth / visibleWidth);
      setTotalPages(pages);
    };

    updatePages();

    window.addEventListener("resize", updatePages);
    return () => window.removeEventListener("resize", updatePages);
  }, [filteredMembers]);

  const onScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const visibleWidth = container.offsetWidth;
    const index = Math.round(scrollLeft / visibleWidth);
    setActiveIndex(index);
  };

  // Scroll to the member card at index i
  const scrollToIndex = (i) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: scrollRef.current.offsetWidth * i,
      behavior: "smooth",
    });
    setActiveIndex(i);
  };

  return (
    <div className='bg-zinc-950 min-h-screen p-2 text-white'>
      <BottomRow />
      <br />
      <br />
      <br />

      <div className="text-white space-y-2">
        <h1 className="text-2xl font-semibold">Pack Physique</h1>
        <div className="flex items-center text-sm text-zinc-400 gap-2">
          <MapPin className="w-4 h-4 text-red-400" />
          <span>Mumbai, India</span>
        </div>
      </div>
      <br />
      <div className="flex flex-col  md:flex-row gap-4">
        <GymCapacity
          day="Monday"
          date="Jun 10"
          preachersCount={10}
          capacityPercent={35}
          currentCapacity={9}
        />
        <InsightCard
          title="Daily Insight"
          insight="Consistency is what turns average into excellence."
          footer="– Unknown"
          imageUrl="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
          imageAlt="Motivational sunrise"
        />
      </div>
      <br />

<div className="h-fit w-full border border-zinc-800 rounded-lg p-2 text-xl font-semibold">
  Clan Members

  {/* Search bar container with relative positioning */}
  <div className="relative w-full my-3">
    {/* Search icon */}
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
      <svg
        className="w-5 h-5 text-zinc-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35m0 0a7 7 0 11-9.9-9.9 7 7 0 019.9 9.9z"
        ></path>
      </svg>
    </div>


    <input
      type="text"
      placeholder="Search members by name..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full p-2 pl-10 rounded-md bg-zinc-900 text-white border border-zinc-700 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-zinc-50"
    />
  </div>

  {/* Scrollable container */}
  <div
    ref={scrollRef}
    onScroll={onScroll}
    className="overflow-x-auto flex gap-4 snap-mandatory scroll-smooth scrollbar-hide"
    style={{ scrollSnapType: "x mandatory" }}
  >
    <div className="flex gap-4 min-w-max">
      {filteredMembers.map((member, i) => (
        <ProfileCard
          key={i}
          profile={member}
          onRequest={() => alert(`Request sent to ${member.name}! 🏋️‍♂️`)}
        />
      ))}
    </div>
  </div>

  {/* Pagination dots */}
  <div className="flex justify-center mt-3 space-x-2">
    {[...Array(totalPages)].map((_, i) => (
      <button
        key={i}
        onClick={() => scrollToIndex(i)}
        className={`h-3 w-3 rounded-full ${
          i === activeIndex ? "bg-emerald-500" : "bg-zinc-700"
        }`}
        aria-label={`Go to page ${i + 1}`}
      />
    ))}
  </div>
</div>
<br />
<div className='overflow-x-auto border border-zinc-800 p-2 rounded-lg  gap-4 snap-mandatory scroll-smooth scrollbar-hide '>
    <p className='text-xl font-semibold'>Features Coming Soon</p>
    
    <div className='flex gap-4 min-w-max mt-2'>
        <Features
        imageSrc="https://img.freepik.com/free-photo/fantasy-group-adventurers_23-2151470681.jpg?ga=GA1.1.1570806321.1723294838&semt=ais_hybrid&w=740"
        title="Clan Community"
        description="Join our vibrant community of fitness enthusiasts, share your journey, and connect with like-minded individuals."

      />
      <Features
  imageSrc="https://img.freepik.com/free-vector/chat-concept-illustration_114360-2299.jpg?w=740"
  title="Real-Time Chat"
  description="Connect instantly with gym buddies, share progress, motivate each other, and keep the grind alive—anytime, anywhere."
/>
<Features
  imageSrc="https://img.freepik.com/free-vector/credit-card-payment_78370-2166.jpg?w=740"
  title="Membership Payments"
  description="Easily manage your gym subscriptions with secure and seamless payment options tailored to your fitness plan."
/>



    </div>

</div>


      <br />
      <br />
      <br />
      <br />
    </div>
  );
}

export default Clan;
