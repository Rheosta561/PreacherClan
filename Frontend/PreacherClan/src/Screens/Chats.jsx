import React, { useState } from 'react';
import { Search } from 'lucide-react';
import ChatCard from '../Components/ChatCard';
import ravenSpeak from '../assets/ravenSpeak.png'
const dummyChats = [
  {
    id: 1,
    username: 'Athelstan',
    latestMessage: "I've begun translating the old scriptures.",
    timestamp: 'Yesterday',
    profileImage: 'https://i.pravatar.cc/150?img=61',
    isGroup: false,
    unreadCount: 0,
  },
  {
    id: 2,
    username: 'Shield Wall',
    latestMessage: 'Ready to defend the settlement.',
    timestamp: '10:42 AM',
    profileImage: '/images/group-shieldwall.png',
    isGroup: true,
    participants: ['You', 'Bjorn', 'Torvi'],
    unreadCount: 1,
  },
  {
    id: 3,
    username: 'Lagertha',
    latestMessage: 'The shield-maidens await your command.',
    timestamp: '09:15 AM',
    profileImage: 'https://i.pravatar.cc/150?img=47',
    isGroup: false,
    unreadCount: 2,
  },
];

function Chats() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = dummyChats.filter(chat =>
    chat.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-zinc-950 w-screen pt-20 min-h-screen text-white p-2 pr-4">
      
      {/* Logo */}
      <div className=" p-8  w-1/4 md:w-32 h-14  flex items-center justify-center text-lg font-bold">
      <img src={ravenSpeak} alt="" className=' ' />
      </div>

      {/* Search Box */}
      <div className="relative w-full ">
        <input
          type="text"
          placeholder="Search the halls of Valhalla..."
          className="w-full py-2 px-4 pl-10 rounded-lg bg-zinc-200 text-zinc-950 border border-zinc-950 placeholder-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-950" />
      </div>

      {/* Chat Cards */}
      <div className="w-full border mt-4 rounded-lg bg-zinc-950 border-zinc-800 overflow-y-auto p-2 max-h-[75vh]">
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => (
            <ChatCard key={chat.id} {...chat} />
          ))
        ) : (
          <p className="text-center text-zinc-500 py-4">No warriors found in the mead hall.</p>
        )}
      </div>
    </div>
  );
}

export default Chats;
