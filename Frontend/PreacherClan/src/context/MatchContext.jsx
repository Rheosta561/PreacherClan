import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const MatchContext = createContext();

export const MatchProvider = ({ children }) => {
  const [match, setMatch] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user)?._id : null;

    if (!userId || userId===null) return;

    const socket = io('https://preacherclan.onrender.com'); 
    socketRef.current = socket;

    socket.emit('userOnline', userId);

    socket.on('matchAccepted', (matchUserData) => {
      
      setMatch(matchUserData);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <MatchContext.Provider value={{ match, setMatch }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => useContext(MatchContext);
