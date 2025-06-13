const Chat = require('../Models/Chat');

const getUserChats = async (req, res) => {
  try {
    const userId = req.body.user._id;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', '_id username')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'username _id',
        },
      })
      .sort({ updatedAt: -1 }); 

    res.status(200).json(chats);
  } catch (error) {
    console.error('getUserChats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};


module.exports = {
  getUserChats,
};
