const Chat = require('../Models/Chat');
const User = require('../Models/User');

const getUserChats = async (req, res) => {
  try {
    const userId = req.body.user._id;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', '_id username image name')
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

const createUserChat = async (req, res) => {
  try {
    const userId = req.params.userId;
    const receiverId = req.params.receiverId;
    const receiver = await User.findOne({_id:receiverId});


    // Check if chat already exists between the two users
    let chat = await Chat.findOneAndUpdate({
      participants: { $all: [userId, receiverId] }
    } , {chatName:receiver.name} ,{new:true });

    if (chat) {
      return res.status(200).json(chat); // chat exists, return it
    }
    
    // If not, create a new chat
    chat = new Chat({
        chatName : receiver.name,
      participants: [userId, receiverId]
    });

    await chat.save();

    return res.status(201).json(chat); //chat created
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  getUserChats,
  createUserChat
};
