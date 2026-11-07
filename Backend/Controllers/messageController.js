const Message = require('../Models/Message');
const Chat = require('../Models/Chat');
const User = require('../Models/User');
const { getIo, onlineUsers } = require('../socket');
const { sendNotification } = require('../Utils/NotificationService');
const mongoose = require('mongoose');



const sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;

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
      if (!mongoose.isValidObjectId(chatId)) return res.status(400).json({ error: 'Invalid chat ID' });
      chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      if (!chat.participants.some((id) => String(id) === String(sender))) {
        return res.status(403).json({ error: "Not a participant in this chat" });
      }
      if (receiverId && !chat.participants.some((id) => String(id) === String(receiverId))) {
        return res.status(400).json({ error: "Receiver is not in this chat" });
      }
    } else {
      if (!mongoose.isValidObjectId(receiverId) || String(sender) === String(receiverId)) {
        return res.status(400).json({ error: 'Invalid receiver ID' });
      }
      chat = await Chat.findOne({ pairKey: [String(sender), String(receiverId)].sort().join(':') });
      if (!chat) return res.status(404).json({ error: 'Chat not found; open the conversation first' });
      if (!chat.participants.some((id) => String(id) === String(sender))) {
        return res.status(403).json({ error: 'Not a participant in this chat' });
      }
    }

    const allowedMessageTypes = ['text', 'image', 'video', 'file', 'gif', 'sticker'];
    if (!allowedMessageTypes.includes(messageType)) return res.status(400).json({ error: 'Invalid message type' });
    if (replyTo) {
      if (!mongoose.isValidObjectId(replyTo) || !(await Message.exists({ _id: replyTo, chat: chat._id }))) {
        return res.status(400).json({ error: 'Reply target does not belong to this chat' });
      }
    }

    // media files
    if (!content?.trim() && !(req.files || []).length) {
      return res.status(400).json({ error: 'A message or attachment is required' });
    }
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
      media,
      replyTo,
    });

    // updating chat
    chat.latestMessage = newMessage._id;
    await chat.save();

    //populating message
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "username _id image name")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "username _id image",
        },
      });

    try {
      // Socket and offline notification delivery is best effort.
      const io = getIo();
      const fullChat = await chat.populate(
        "participants",
        "_id username name"
      );

      for (const user of fullChat.participants) {
        if (user._id.toString() === sender.toString()) continue;

        const socketId = onlineUsers.get(user._id.toString());

        if (socketId && io) {
          // ONLINE real-time message
          io.to(socketId).emit("newMessage", populatedMessage);
        } else {
          // OFFLINE notification only
          const foundUser = await User.findById(user._id);

          if (foundUser) {
           const previewText =
    messageType === "text"
      ? content
      : messageType === "image"
      ? "📸 Image"
      : messageType === "video"
      ? "🎥 Video"
      : "📎 Attachment";
  await sendNotification(
    foundUser,
    `💬 ${populatedMessage.sender.username}: ${previewText}`,
    "New Message ⚔️",
    "info",        // DB severity
    "CHAT",        // navigation type
    {
      receiverId: sender.toString(), // used by frontend router
      senderName : populatedMessage.sender.name
    }
  );


          }
        }
      }

    } catch (deliveryError) {
      console.error('Message delivery side effect failed:', deliveryError.message);
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

    if (!mongoose.isValidObjectId(chatId)) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

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
    const userId = req.user.id;
    if (!mongoose.isValidObjectId(messageId)) return res.status(400).json({ error: 'Invalid message ID' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const chatMembership = await Chat.exists({ _id: message.chat, participants: userId });
    if (!chatMembership) return res.status(403).json({ error: 'Not a participant in this chat' });

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
    if (String(chat.latestMessage) === String(message._id)) {
      const previous = await Message.findOne({ chat: message.chat, isDeleted: false, _id: { $ne: message._id } }).sort({ createdAt: -1 });
      chat.latestMessage = previous?._id || null;
      await chat.save();
    }
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



