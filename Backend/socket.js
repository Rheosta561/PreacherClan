// socket.js
const { Server } = require('socket.io');

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

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
}

module.exports = {
  initSocket,
  getIo: () => io,   
  onlineUsers,       
};
