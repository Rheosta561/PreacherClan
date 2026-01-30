const Chat = require('../Models/Chat');
const User = require('../Models/User');

const getUserChats = async (req, res) => {
  try {
    const userId = req.body.user._id;

    const chats = await Chat.find({
      participants: userId,
      $or: [
        { deletedFor: { $exists: false } },   // old chats
        { deletedFor: { $nin: [userId] } }    // not deleted by user
      ]
    })
      .populate({
        path: "participants",
        select: "_id username image name profile",
        populate: {
          path: "profile",
          select: "profileImage",
        },
      })
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "username _id",
        },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    console.error("getUserChats error:", error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};




const createUserChat = async (req, res) => {
  try {
    const userId = req.params.userId;
    const receiverId = req.params.receiverId;

    // fetch receiver & profile image
    const receiver = await User.findById(receiverId)
      .populate("profile", "profileImage name");

    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    const chatImage = receiver?.profile?.profileImage ?? "";


    // check if chat already exists
    let chat = await Chat.findOneAndUpdate(
      {
        participants: { $all: [userId, receiverId] }
      },
      {
        chatName: receiver.name,
        chatImage    
      },
      { new: true }
    );


    if (chat) {

      return res.status(200).json(chat);
    }

    // otherwise create new chat
    chat = new Chat({
      chatName: receiver.name,
      chatImage,
      participants: [userId, receiverId]
    });


    await chat.save();

    return res.status(201).json(chat);

  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};



const searchUserChats = async (req, res) => {
  try {
    const userId = req.body.user._id;
    const query = req.query.q?.trim() || "";

    if (!query) {
      return res.status(400).json({ error: "Search query missing" });
    }

// searching chats where user is participant 
    let chats = await Chat.find({
      participants: userId,
      $or: [
        { deletedFor: { $exists: false } },
        { deletedFor: { $nin: [userId] } }
      ]
    })
      .populate("participants", "_id username image name")
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "username _id"
        }
      })
      .sort({ updatedAt: -1 });

    // Filter in memory (because populated fields)
    const q = query.toLowerCase();

    chats = chats.filter(chat => {
      const chatName = chat.chatName?.toLowerCase() || "";

      const participantMatch = chat.participants.some(p =>
        (p.username?.toLowerCase() || "").includes(q) ||
        (p.name?.toLowerCase() || "").includes(q)
      );

      const latestMessageMatch =
        chat.latestMessage?.content
          ?.toLowerCase()
          ?.includes(q) || false;

      return (
        chatName.includes(q) ||
        participantMatch ||
        latestMessageMatch
      );
    });

    res.status(200).json(chats);
  } catch (error) {
    console.error("searchUserChats error:", error);
    res.status(500).json({ error: "Failed to search chats" });
  }
};



const deleteChatForMe = async (req, res) => {
  try {
    const { chatId } = req.params;
const {userId} = req.body ; 

console.log('user Id' , userId , 'chatId ' , chatId);

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // ensure user belongs to chat
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Chat.findByIdAndUpdate(chatId, {
      $addToSet: { deletedFor: userId },
    });

    return res.status(200).json({
      success: true,
      message: "Chat deleted for you",
    });

  } catch (error) {
    console.error("deleteChatForMe error:", error);
    return res.status(500).json({
      message: "Failed to delete chat",
    });
  }
};
;



module.exports = {
  getUserChats,
  createUserChat,
  searchUserChats,
  deleteChatForMe
};
