const User = require("../Models/User");
const Request = require("../Models/Requests");
const notificationService = require("../Utils/NotificationService");
const {sendMatchNotification} = require("../Utils/matchService");
const path = require("path");
const Profile = require("../Models/Profile");
const Gym = require("../Models/GymSchema");


exports.requestAccepter = async (req, res) => {
  try {
    const { userId, requestId } = req.params;

    const request = await Request.findByIdAndUpdate(
      requestId,
      { status: "accepted" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $addToSet: { partner: request.sender } }
      ),
      User.findByIdAndUpdate(
        request.sender,
        { $addToSet: { partner: userId } }
      )
    ]);

    const user = await User.findById(userId);
    const partner = await User.findById(request.sender);

    const message = `🪓 Hail! ${user.name} has answered your call. Destiny binds you now — begin your saga in chat! 🔥`;

    sendNotification(
  partner,
  message,
  "RepMate Match ⚔️",
  "info",
  "REPMATE"
);



    await sendMatchNotification(partner, user);

    return res.status(200).json({
      message: "Request accepted successfully",
      user,
      request,
    });

  } catch (error) {
    console.error("Error in requestAccepter:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.requestRejecter = async(req,res) =>{
    try {
        const {userId, requestId} = req.params;
        const request = await Request.findOneAndUpdate(
            {_id:requestId }, { status: "rejected" } , { new: true }
        );
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        const user = await User.findOneAndUpdate({
            _id:userId
        } , {$pull:{partner:request.sender}} , { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "Request rejected successfully", user });

        
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });

        
    }
}

exports.requestSender = async(req,res) =>{
    try {
        const {userId, partnerId} = req.params;

        console.log(userId , partnerId)
        const partner = await User.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isAlreadyRequested = await Request.findOne({
            sender: userId,
            receiver: partnerId,
            status: "pending"
        });

        console.log('user' , user);
        console.log('partner', partner);
const isAlreadyAFriend =
  user.partner?.some(id => id.toString() === partnerId) ||
  partner.partner?.some(id => id.toString() === userId);



        // console.log(isAlreadyRequested)
        if(isAlreadyAFriend){
          console.log('already a friend');
          return res.status(401).json({message : "Already a friend"});
        }
        if (isAlreadyRequested) {
            return res.status(400).json({ message: "Request already sent" });
        }
        
        const request = await Request.create({
            sender: userId,
            receiver: partnerId,
            status: "pending"
        });
        const message = `🪓 Hail! Request Sent Successfully to ${partner.name}`;

        const partnerMessage = `🪓 Hail! You have a new request from ${user.name}`;

 await notificationService.sendNotification(
  user,
  message,
  "Request Sent ⚔️",
  "info",
  "PROMO"
);



await notificationService.sendNotification(
  partner,
  partnerMessage,
  "New RepMate Request 🪓",
  "info",
  "REPMATE"
);



        
        if (!request) {
            return res.status(404).json({ message: "Request not created" });
        }
        
        
        return res.status(200).json({ message: "Request sent successfully", user , request });

        
    } catch (error) {
      console.error(error);
        return res.status(500).json({ message: "Internal server error", error: error.message });

        
    }
}   

exports.getRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const requests = await Request.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "pending"
    })
      .populate({
        path: 'sender',
        populate: { path: 'profile' }
      })
      .populate({
        path: 'receiver',
        populate: { path: 'profile' }
      })
      .lean(); 
    // Format each request with sender and receiver's user+profile
    const formattedRequests = await Promise.all(
      requests.map(async (request) => {
        const senderUser = await User.findById(request.sender._id).lean();
        console.log(senderUser)

        const userGym = await Gym.findById(senderUser.gym?.id).lean();
        const userGymName = userGym ? userGym.name : "";

        const receiverUser = await User.findById(request.receiver._id).lean();
        const receiverGymName = receiverUser.gym?.name;


        return {
          _id: request._id,
          status: request.status,
          createdAt: request.createdAt,

          sender: {
            user: senderUser,
            profile: request.sender.profile,
            gym: userGymName,

          },

          receiver: {
            user: receiverUser,
            profile: request.receiver.profile,
            gym: receiverGymName,
          }
        };
      })
    );

    return res.status(200).json({ requests: formattedRequests });

  } catch (error) {
    console.error("Error in getRequests:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


