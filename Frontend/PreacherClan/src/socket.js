// src/socket.js
import { io } from 'socket.io-client';

// Backend URL 
const SOCKET_URL = 'https://preacherclan.onrender.com'; 

export const socket = io(SOCKET_URL, {
  transports: ['websocket'], // using the  websocket
});
