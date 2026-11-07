const Chat = require('../Models/Chat');
const Message = require('../Models/Message');
const User = require('../Models/User');
const mongoose = require('mongoose');

const pairIndexReady = Chat.collection.createIndex({ pairKey: 1 }, { unique: true, sparse: true });

const getPairKey = (userId, receiverId) => [String(userId), String(receiverId)].sort().join(':');
const pairFilter = (userId, receiverId) => ({
  isGroupChat: false,
  participants: { $all: [userId, receiverId], $size: 2 },
});

async function consolidatePairChats(userId, receiverId, pairKey) {
  const chats = await Chat.find(pairFilter(userId, receiverId)).sort({ updatedAt: -1, _id: 1 });
  if (!chats.length) return null;

  const canonical = chats[0];
  const duplicates = chats.slice(1);
  const deletedFor = new Set(chats.flatMap((chat) => (chat.deletedFor || []).map(String)));
  canonical.pairKey = pairKey;
  canonical.deletedFor = [...deletedFor];
  if (duplicates.length) {
    const duplicateIds = duplicates.map((chat) => chat._id);
    await Message.updateMany({ chat: { $in: duplicateIds } }, { $set: { chat: canonical._id } });
    const latestMessage = await Message.findOne({ chat: canonical._id }).sort({ createdAt: -1, _id: -1 }).select('_id');
    if (latestMessage) canonical.latestMessage = latestMessage._id;
    await Chat.deleteMany({ _id: { $in: duplicateIds } });
  }
  canonical.deletedFor = (canonical.deletedFor || []).filter((id) => String(id) !== String(userId));
  await canonical.save();
  return canonical;
}

function deduplicateOneToOneChats(chats) {
  const seen = new Set();
  return chats.filter((chat) => {
    if (chat.isGroupChat || !Array.isArray(chat.participants) || chat.participants.length !== 2) return true;
    const ids = chat.participants.map((participant) => String(participant._id ?? participant)).sort();
    const key = ids.join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({
      participants: userId,
      $or: [{ deletedFor: { $exists: false } }, { deletedFor: { $nin: [userId] } }],
    })
      .populate({
        path: 'participants',
        select: '_id username image name profile',
        populate: { path: 'profile', select: 'profileImage' },
      })
      .populate({ path: 'latestMessage', populate: { path: 'sender', select: 'username _id' } })
      .sort({ updatedAt: -1, _id: -1 });

    return res.status(200).json(deduplicateOneToOneChats(chats));
  } catch (error) {
    console.error('getUserChats error:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

const createUserChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { receiverId } = req.params;
    if (!mongoose.isValidObjectId(receiverId)) return res.status(400).json({ error: 'Invalid receiver ID' });
    if (String(userId) === String(receiverId)) return res.status(400).json({ error: 'Cannot create a chat with yourself' });

    const [sender, receiver] = await Promise.all([
      User.findById(userId).select('_id'),
      User.findById(receiverId).populate('profile', 'profileImage'),
    ]);
    if (!sender || !receiver) return res.status(404).json({ error: 'User not found' });

    await pairIndexReady;
    const pairKey = getPairKey(userId, receiverId);
    let chat = await consolidatePairChats(userId, receiverId, pairKey);
    if (!chat) {
      try {
        chat = await Chat.findOneAndUpdate(
          { pairKey },
          {
            $setOnInsert: {
              pairKey,
              chatName: receiver.name,
              chatImage: receiver.profile?.profileImage || '',
              participants: [userId, receiverId],
              isGroupChat: false,
            },
            $pull: { deletedFor: userId },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        chat = await Chat.findOne({ pairKey });
      }
    }

    if (!chat) return res.status(500).json({ error: 'Could not open chat' });
    chat.deletedFor = (chat.deletedFor || []).filter((id) => String(id) !== String(userId));
    await chat.save();
    return res.status(200).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const searchUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q?.trim().toLowerCase() || '';
    if (!query) return res.status(400).json({ error: 'Search query missing' });

    const result = await Chat.find({
      participants: userId,
      $or: [{ deletedFor: { $exists: false } }, { deletedFor: { $nin: [userId] } }],
    })
      .populate('participants', '_id username image name')
      .populate({ path: 'latestMessage', populate: { path: 'sender', select: 'username _id' } })
      .sort({ updatedAt: -1, _id: -1 });

    const chats = deduplicateOneToOneChats(result).filter((chat) => {
      const chatName = chat.chatName?.toLowerCase() || '';
      const participantMatch = chat.participants.some((person) =>
        (person.username?.toLowerCase() || '').includes(query) || (person.name?.toLowerCase() || '').includes(query),
      );
      return chatName.includes(query) || participantMatch || chat.latestMessage?.content?.toLowerCase().includes(query);
    });
    return res.status(200).json(chats);
  } catch (error) {
    console.error('searchUserChats error:', error);
    return res.status(500).json({ error: 'Failed to search chats' });
  }
};

const deleteChatForMe = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.isValidObjectId(chatId)) return res.status(400).json({ message: 'Invalid chat ID' });
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, participants: req.user.id },
      { $addToSet: { deletedFor: req.user.id } },
      { new: true },
    );
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    return res.status(200).json({ success: true, message: 'Chat deleted for you' });
  } catch (error) {
    console.error('deleteChatForMe error:', error);
    return res.status(500).json({ message: 'Failed to delete chat' });
  }
};

module.exports = { getUserChats, createUserChat, searchUserChats, deleteChatForMe };
