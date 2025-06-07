import { createContext, useContext, useEffect, useRef , useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { usePersistentState } from '../hooks/usePersistentState';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
     const [notifications , setNotifications] = usePersistentState('notifications' ,[]);
  const socketRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    const userId = user ? JSON.parse(user)._id : null;
   
    if (!userId) return;

    const socket = io('http://localhost:3000'); // adjust your server URL
    socketRef.current = socket;

    socket.emit('userOnline', userId);

    socket.on('notification', (notification) => {
      toast(`📢 ${notification.message}`);
        setNotifications((prev) => [...prev, notification]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
        notifications
        ,
        setNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
