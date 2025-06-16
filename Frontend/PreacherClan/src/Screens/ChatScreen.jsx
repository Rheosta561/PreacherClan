import React, { useRef, useState, useEffect } from 'react';
import { Mic, Paperclip, Send, X, MoreVertical } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import axios from 'axios';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

// Import and state declarations remain unchanged...

function ChatScreen() {
const {messages , setMessages} = useChat();
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);
  const messageRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);
  const [chat, setChat] = useState(null);
  const userId = useParams().userId;
  const receiverId = useParams().receiverId;
  const navigate = useNavigate();
  console.log('message from context ' , messages);


  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const profile = JSON.parse(localStorage.getItem('profile'));
if(!profile){
    navigate('/login');
    
}
  useEffect(() => {
    if (!userId || !receiverId) return;

    const fetchChat = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/chat/${userId}/${receiverId}`);
        console.log(res);
        setChat(res.data);
      } catch (err) {
        console.error('Failed to fetch chat:', err.message);
      }
    };

    fetchChat();
  }, [userId, receiverId]);
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



useEffect(() => {
  if (!chat?._id) return;

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/message/fetch/${chat._id}`);
      console.log(response.status)
setMessages(
  response.data.map((msg) => {
    const media = safeParseMedia(msg.media);
    console.log(media);

    const base = {
      id: msg._id,
      text: msg.content,
      sender: msg.sender._id === userId ? 'me' : 'other',
      timestamp: msg.createdAt || new Date(),
      profileImage: msg.sender._id===userId? profile.profileImage : 'https://i.pravatar.cc/40?img=7',
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
  })
);




    } catch (error) {
      console.error('Failed to fetch messages:', error.message);
    }
  };

  fetchMessages();
}, [chat]);
  

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      const payload = {
        userId,
        chatId: chat?._id,
        receiverId,
        content: input,
        messageType: 'text',
      };

      const res = await axios.post('http://localhost:3000/message/send', payload);
      const newMsg = res.data;
      console.log(res.data);

      setMessages((prev) => [
        ...prev,
        {
          id: newMsg._id,
          text: newMsg.content,
          sender: newMsg.sender._id === userId ? 'me' : 'other',
          timestamp: new Date(),
          profileImage: 'https://i.pravatar.cc/40?img=7',
          replyTo: replyingTo,
        },
      ]);

      setInput('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileType = file.type.split('/')[0]; // image, video, audio, etc.
  let messageType = 'file'; // default

  if (fileType === 'image') messageType = 'image';
  else if (fileType === 'video') messageType = 'video';
  else if (fileType === 'audio') messageType = 'file'; 
  else messageType = 'file';

    const formData = new FormData();
    formData.append('media', file);
    formData.append('userId', userId);
    formData.append('chatId', chat?._id);
    formData.append('receiverId', receiverId);
    formData.append('messageType', messageType);

    try {
      const res = await axios.post('http://localhost:3000/message/send', formData);
      const newMsg = res.data;
      console.log(res.data);
      const mediaFile = JSON.parse(res.data.media);

      mediaFile.forEach((m) => {
        
        console.log(m);
        const mediaObj = {
          id: newMsg._id,
          sender: newMsg.sender._id === userId ? 'me' : 'other',
          timestamp: new Date(),
          profileImage: 'https://i.pravatar.cc/40?img=7',
          fileName: m.fileName || file.name,
        };

        if (m.type === 'image') mediaObj.image = m.url;
        else if (m.type === 'video') mediaObj.video = m.url;
        else if (m.type === 'audio') mediaObj.audio = m.url;
        else mediaObj.file = m.url;

        setMessages((prev) => [...prev, mediaObj]);
      });
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const sendAudioBlob = async (blob) => {
    const file = new File([blob], 'audio-message.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('chatId', chat?._id);
    formData.append('receiverId', receiverId);
    formData.append('messageType', 'media');

    try {
      const res = await axios.post('http://localhost:3000/message/send', formData);
      const newMsg = res.data;
      console.log(newMsg)

      newMsg.media?.forEach((m) => {
        if (m.type === 'audio') {
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg._id,
              sender: newMsg.sender._id === userId ? 'me' : 'other',
              timestamp: new Date(),
              audio: m.url,
              profileImage: 'https://i.pravatar.cc/40?img=7',
              fileName: m.fileName || 'audio',
            },
          ]);
        }
      });
    } catch (err) {
      console.error('Audio upload failed:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        sendAudioBlob(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Mic permission denied', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleDelete = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const handleReply = (id) => {
    setReplyingTo(id);
    setShowDropdown(null);
  };

  const handleScrollToMessage = (id) => {
    const element = messageRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 pt-20 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender === 'me';
          const repliedMsg = messages.find((m) => m.id === msg.replyTo);

          return (
            <div
              key={msg.id}
              ref={(el) => (messageRefs.current[msg.id] = el)}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${
                highlightedId === msg.id ? 'animate-pulse rounded' : ''
              }`}
            >
              {!isMe && (
                <img src={msg.profileImage} className="w-8 h-8 rounded-full" alt="profile" />
              )}
              <div
                className={`relative group max-w-xs px-4 py-2 rounded-lg ${
                  isMe ? 'bg-indigo-700' : 'bg-zinc-800'
                } shadow`}
              >
                {repliedMsg && (
                  <div
                    className="text-xs text-zinc-300 mb-1 border-l-2 border-zinc-300 pl-2 italic cursor-pointer hover:text-white"
                    onClick={() => handleScrollToMessage(repliedMsg.id)}
                  >
                    {repliedMsg.text || repliedMsg.fileName || 'Media Reply'}
                  </div>
                )}
                {msg.text && <p>{msg.text}</p>}
                {msg.image && (
                  <img src={msg.image} className="rounded mt-1 max-w-full max-h-40" alt="img" />
                )}
                {msg.video && (
                  <video src={msg.video} controls className="rounded mt-1 max-w-full max-h-52" />
                )}
                {msg.audio && (
                  <div className="bg-zinc-900 rounded p-2 mt-1 min-w-[200px] w-full">
                    <audio src={msg.audio} controls className="w-full mt-2" />
                  </div>
                )}
                {msg.file && (
                  <a href={msg.file} download className="underline mt-1 block">
                    📎 {msg.fileName}
                  </a>
                )}
                <div className="text-xs text-zinc-300 mt-1 flex items-center justify-between gap-2">
                  <span>{formatTime(msg.timestamp)}</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === msg.id ? null : msg.id)}
                      className="opacity-50 group-hover:opacity-100"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showDropdown === msg.id && (
                      <div className="absolute right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow text-sm z-10">
                        <button
                          onClick={() => handleReply(msg.id)}
                          className="block px-3 py-1 hover:bg-zinc-700 w-full text-left"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="block px-3 py-1 hover:bg-zinc-700 w-full text-left"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isMe && <img src={msg.profileImage} className="w-8 h-8 rounded-full" alt="profile" />}
            </div>
          );
        })}
      </div>

      {replyingTo && (
        <div className="p-2 text-sm bg-zinc-800 text-zinc-200 border-l-4">
          Replying to: {messages.find((msg) => msg.id === replyingTo)?.text || 'Media'}
          <button className="ml-2 text-xs underline" onClick={() => setReplyingTo(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="border-t border-zinc-800 p-4 flex items-center gap-3 bg-zinc-950">
        <button onClick={() => fileInputRef.current.click()}>
          <Paperclip className="text-zinc-300 hover:text-white" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        <input
          type="text"
          placeholder="Type here..."
          className="flex-1 rounded-lg px-4 py-2 bg-zinc-900 border border-zinc-800 text-white focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        {recording ? (
          <button onClick={stopRecording} className="bg-red-600 p-2 rounded-full">
            <X className="text-white" />
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            title="Hold to record"
            className="text-red-500"
          >
            <Mic />
          </button>
        )}
        <button onClick={handleSend}>
          <Send className="text-zinc-300 hover:text-white" />
        </button>
      </div>
    </div>
  );
}

export default ChatScreen;

