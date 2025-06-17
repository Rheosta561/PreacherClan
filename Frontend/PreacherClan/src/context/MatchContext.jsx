import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const MatchContext = createContext();

export const MatchProvider = ({ children }) => {
  const [match, setMatch] = useState(null);
  const socketRef = useRef(null);

  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const userId = parsedUser?._id;

  useEffect(() => {
    if (!userId) return;

    const socket = io('https://preacherclan.onrender.com');
    socketRef.current = socket;

    socket.emit('userOnline', userId);

    socket.on('matchAccepted', (matchUserData) => {
      setMatch(matchUserData);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  return (
    <MatchContext.Provider value={{ match, setMatch }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => useContext(MatchContext);
