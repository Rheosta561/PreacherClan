// src/socket.js
import { io } from 'socket.io-client';

// Backend URL 
const SOCKET_URL = 'http://localhost:3000'; 

export const socket = io(SOCKET_URL, {
  transports: ['websocket'], // using the  websocket
});
