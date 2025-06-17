import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import ChatCard from '../Components/ChatCard';
import ravenSpeak from '../assets/ravenSpeak.png';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Chats() {
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
 
  const currentUserId = user?._id;
  const navigate = useNavigate();
   if(!user){
    navigate('/login');
   }
  const dummyChats = [
    {
      _id: 'chat1',
      chatName: 'Arjun Sharma',
      isGroup: false,
      profileImage: 'https://randomuser.me/api/portraits/men/75.jpg',
      participants: [
        { _id: 'u1', username: 'Arjun Sharma' },
        { _id: currentUserId, username: 'You' }
      ],
      latestMessage: {
        sender: { _id: 'u1' },
        content: 'Bro, are we meeting tomorrow?',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
        readBy: []
      }
    },
    {
      _id: 'chat2',
      chatName: 'Priya Verma',
      isGroup: false,
      profileImage: 'https://randomuser.me/api/portraits/women/65.jpg',
      participants: [
        { _id: 'u2', username: 'Priya Verma' },
        { _id: currentUserId, username: 'You' }
      ],
      latestMessage: {
        sender: { _id: 'u2' },
        content: 'Check out this meme 😄',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        readBy: [currentUserId]
      }
    },
    {
      _id: 'chat3',
      chatName: 'DTU Roomies',
      isGroup: true,
      profileImage: '',
      participants: [
        { _id: 'u3', username: 'Rohit Singh' },
        { _id: 'u4', username: 'Sneha Joshi' },
        { _id: currentUserId, username: 'You' }
      ],
      latestMessage: {
        sender: { _id: 'u4' },
        content: 'Let’s go for chai break 🍵',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day ago
        readBy: ['u3']
      }
    },
    {
      _id: 'chat4',
      chatName: 'Ankita Desai',
      isGroup: false,
      profileImage: 'https://randomuser.me/api/portraits/women/21.jpg',
      participants: [
        { _id: 'u5', username: 'Ankita Desai' },
        { _id: currentUserId, username: 'You' }
      ],
      latestMessage: {
        sender: { _id: 'u5' },
        content: 'Hey! Did you get the notes?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        readBy: []
      }
    }
  ];

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await axios.post('http://localhost:3000/chat/getChats', { user });
        console.log('chatResponse', response.data);
        setChats(response.data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };
    fetchChats();
  }, []);

  // Utility: Get name of the other user in one-on-one chats
  const getOtherParticipantName = (participants) => {
    const other = participants?.find(p => p._id !== currentUserId);
    return other?.username || 'Unknown';
  };

  const handleClick = ( receiverId)=>{
    navigate(`/chat/${currentUserId}/${receiverId}`);
  }

  // Utility: Format timestamp to readable time
 const formatTime = (isoString) => {
  if (!isoString) return '';

  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  // If older than 7 days, show date
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};


 
  const calculateUnread = (chat) => {
    if (!Array.isArray(chat.latestMessage?.readBy)) return 0;
    return chat.latestMessage.readBy.includes(currentUserId) ? 0 : 1;
  };

  const filteredChats = Array.isArray(chats)
    ? chats.filter(chat =>
        Array.isArray(chat.participants) &&
        chat.participants
          .filter(participant => participant._id !== currentUserId)
          .some(participant =>
            participant.username?.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : [];

  const getParticipantName = (participants) =>{
    const filteredParticipant = participants.filter(participant=>participant._id!=currentUserId);
    if(filteredParticipant){
      return filteredParticipant[0].name;
    }else{
      return "Preacher's Raven";
    }
  }

  const getChatImage = (chat) =>{
    if (chat.isGroupChat){
      return chat.image;
    }else{
      const filteredParticipants = chat.participants.filter(user => user._id!= currentUserId);
      if(filteredParticipants){
        return filteredParticipants[0].image;
      }else{
        return 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
      }
    }

  }

  return (
    <div className="bg-zinc-950 w-screen pt-20 min-h-screen text-white p-2 pr-4">
      {/* Logo */}
      <div className="p-8 w-1/4 md:w-32 h-14 flex items-center justify-center text-lg font-bold">
        <img src={ravenSpeak} alt="Raven Speak" />
      </div>

      {/* Search Box */}
      <div className="relative w-full">
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
            <ChatCard
              key={chat._id}
              id={chat._id}
              username={getParticipantName(chat.participants)}
              timestamp={formatTime(chat.latestMessage?.createdAt)}
              profileImage={getChatImage(chat)}
              isGroup={chat.isGroup}
              participants={chat.participants}
              unreadCount={calculateUnread(chat)}
              latestMessage={chat.latestMessage.content}
              sender = {chat.latestMessage.sender._id}
              onclick={()=> handleClick(chat.participants[1]._id)}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500 py-4">No warriors found in the mead hall.</p>
        )}
      </div>
    </div>
  );
}

export default Chats;
