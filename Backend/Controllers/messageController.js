const Message = require('../Models/Message');
const Chat = require('../Models/Chat');
const User = require('../Models/User');
const { getIo, onlineUsers } = require('../socket');
const {sendNotification} = require('../Utils/NotificationService');



const sendMessage = async (req, res) => {
  try {
    const sender = req.body.userId; 
    const { chatId, receiverId, messageType = 'text', content = '' } = req.body;

    if (!chatId && !receiverId) {
      return res.status(400).json({ error: 'Either chatId or receiverId is required' });
    }
    const foundUser = await User.findOne({sender});

    let chat;

    // Case 1: chatId is given — find it
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    }

    // Case 2: receiverId is given — find or create 1-on-1 chat
    else if (receiverId) {
      chat = await Chat.findOne({
        isGroupChat: false,
        participants: { $all: [sender, receiverId] },
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [sender, receiverId],
          isGroupChat: false,
        });
      }
    }

    // Process media uploads if any
    const mediaFiles = req.files || [];
    const media = mediaFiles.map((file) => ({
      public_id: file.filename,
      url: file.path,
      type: file.mimetype.split('/')[0],
    }));

    // Create message
    const newMessage = await Message.create({
      sender,
      chat: chat._id,
      messageType,
      content,
      media,
    });

    
    chat.latestMessage = newMessage._id;
    await chat.save();

    const populatedMessage = await newMessage.populate('sender', 'username _id');


    const io = getIo();
    const fullChat = await chat.populate('participants', '_id username');

    for (const user of fullChat.participants) {
      const socketId = onlineUsers.get(user._id.toString());
      if (socketId && user._id.toString() !== sender.toString()) {
        sendNotification(user, `New message from ${foundUser.name}`, 'info');
        io.to(socketId).emit('newMessage', populatedMessage);
      }
    }

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};



const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username _id')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.body.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Allow only sender to delete
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    // Soft delete
    message.isDeleted = true;
    message.content = ''; 
    message.media = [];   
    await message.save();

    
    const chat = await Chat.findById(message.chat).populate('participants', '_id');
    const io = getIo();
    for (const user of chat.participants) {
      const socketId = onlineUsers.get(user._id.toString());
      if (socketId) {
        io.to(socketId).emit('messageDeleted', { messageId });
      }
    }

    res.status(200).json({ message: 'Message deleted', messageId });
  } catch (err) {
    console.error('deleteMessage error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  sendMessage,
  getMessages, 
  deleteMessage
};



