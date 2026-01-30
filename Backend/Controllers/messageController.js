const Message = require('../Models/Message');
const Chat = require('../Models/Chat');
const User = require('../Models/User');
const { getIo, onlineUsers } = require('../socket');
const {sendNotification} = require('../Utils/NotificationService');



const sendMessage = async (req, res) => {
  try {
    const sender = req.body.userId;

    const {
      chatId,
      receiverId,
      messageType = "text",
      content = "",
      replyTo = null,
    } = req.body;

    if (!chatId && !receiverId) {
      return res
        .status(400)
        .json({ error: "Either chatId or receiverId is required" });
    }

    let chat;

// find or create 
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
    } else {
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

    // media files 
    const mediaFiles = req.files || [];

    const media = mediaFiles.map((file) => ({
      public_id: file.filename,
      url: file.path,
      type: file.mimetype.startsWith("image")
        ? "image"
        : file.mimetype.startsWith("video")
        ? "video"
        : file.mimetype.startsWith("audio")
        ? "audio"
        : "file",
    }));

    //creating message 
    const newMessage = await Message.create({
      sender,
      chat: chat._id,
      messageType,
      content,
      media: JSON.stringify(media),
      replyTo,
    });

    // updating chat 
    chat.latestMessage = newMessage._id;
    await chat.save();

    //populating message 
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username _id image")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "username _id image",
        },
      });

    // socket and notificaiton 
    const io = getIo();
    const fullChat = await chat.populate(
      "participants",
      "_id username"
    );

    for (const user of fullChat.participants) {
      if (user._id.toString() === sender.toString()) continue;

      const socketId = onlineUsers.get(user._id.toString());

      if (socketId) {
        // ONLINE real-time message
        io.to(socketId).emit("newMessage", populatedMessage);
      } else {
        // OFFLINE notification only
        const foundUser = await User.findById(user._id);

        if (foundUser) {
          await sendNotification(
            foundUser,
            "New message",
            `New message from ${populatedMessage.sender.username}`,
            "info",
            "chat",
            `/chats/${chat._id}`
          );
        }
      }
    }

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

module.exports = { sendMessage };





const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username _id image')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username _id image' }
      })
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



