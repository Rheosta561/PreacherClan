// src/context/ProfileContext.js
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user)?._id : null;

    if (!userId) return;

    const socket = io('https://preacherclan.onrender.com'); 
    socketRef.current = socket;
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.emit('userOnline', userId);

    socket.on('profileUpdated', (updatedProfile) => {
      toast('📝 Your profile was updated!');
      console.log('Received profileUpdated:', updatedProfile);

      // Update local state
      setProfile(updatedProfile);

      
      localStorage.setItem('profile', JSON.stringify(updatedProfile));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
