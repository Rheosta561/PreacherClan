import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import VikingToaster from '../Components/VikingToaster';




const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const socketRef = useRef(null);

  const storedUser = localStorage.getItem('user');
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;

  const userId = parsedUser?._id;
  const profileImage = parsedUser?.image || ''

  const safeParseMedia = (mediaArray) => {
    try {
      if (!Array.isArray(mediaArray)) return [];
      return mediaArray.flatMap((m) => {
        if (typeof m === 'string') return JSON.parse(m);
        return [m];
      });
    } catch (err) {
      console.warn('Failed to parse media:', err.message);
      return [];
    }
  };

  const parseSocketMessage = (msg, userId, profileImage) => {
    const media = safeParseMedia(msg.media);

    const base = {
      id: msg._id,
      text: msg.content,
      sender: msg.sender._id === userId ? 'me' : 'other',
      timestamp: msg.createdAt || new Date(),
      profileImage: msg.sender._id === userId ? profileImage : 'https://i.pravatar.cc/40?img=7',
      replyTo: msg.replyTo || null,
    };

    media.forEach((m) => {
      if (m.type === 'image') base.image = m.url;
      else if (m.type === 'video') base.video = m.url;
      else if (m.type === 'audio') base.audio = m.url;
      else base.file = m.url;

      base.fileName = m.fileName || m.url?.split('/').pop();
    });

    return base;
  };

  useEffect(() => {
    if (!userId) return;

    const socket = io('https://preacherclan.onrender.com');
    socketRef.current = socket;
    setSocket(socket);

    socket.emit('userOnline', userId);

    socket.on('newMessage', (msg) => {
      const formattedMessage = parseSocketMessage(msg, userId, profileImage);
      setMessages((prev) => [...prev, formattedMessage]);
      setToast({ visible: true, message: `New message from ${msg.sender.username}` });
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    return () => socket.disconnect();
  }, [userId]);

  const sendMessage = (msg) => {
    if (!socket) return;
    socket.emit('sendMessage', msg);
  };

  return (
    <ChatContext.Provider value={{ socket, messages, setMessages, sendMessage }}>
      {children}

      <VikingToaster
        visible={toast.visible}
        message={toast.message}
        onClose={() => setToast({ visible: false, message: '' })}
      />
      
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
