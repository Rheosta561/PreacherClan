// socket.js
const { Server } = require('socket.io');
const workoutJamSocket = require('./Socket/workoutJam.socket');

let io = null;
const onlineUsers = new Map();

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],
    },
  });
    console.log('Socket.IO initialized');

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When user identifies themselves
    socket.on('userOnline', (userId) => {
      onlineUsers.set(userId.toString(), socket.id);
      console.log(`User ${userId} is online with socket ${socket.id}`);
    });

    workoutJamSocket(io , socket);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    // TYPING START
    socket.on("typing:start", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing:start", { chatId, userId });

      clearTimeout(socket.typingTimer);
      socket.typingTimer = setTimeout(() => {
        socket.to(chatId).emit("typing:stop", { chatId, userId });
      }, 3000);
    });

    // TYPING STOP
    socket.on("typing:stop", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing:stop", { chatId, userId });
    });
  });
}

module.exports = {
  initSocket,
  getIo: () => io,   
  onlineUsers,       
};
