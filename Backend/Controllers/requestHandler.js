const User = require("../Models/User");
const Request = require("../Models/Requests");
const notificationService = require("../Utils/NotificationService");
const {sendMatchNotification} = require("../Utils/matchService");
const path = require("path");
const Profile = require("../Models/Profile");
const Gym = require("../Models/GymSchema");


exports.requestAccepter = async(req,res) =>{
    try {
        const {userId, requestId} = req.params;
        const request = await Request.findOneAndUpdate(
            {_id:requestId }, { status: "accepted" } , { new: true }
        );
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        const user = await User.findOneAndUpdate({
            _id:userId
        } , {$push:{partner:request.sender}} , { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Send notification to the user
        const partner = await User.findById(request.sender);
        if (!partner) {
            return res.status(404).json({ message: "Partner not found" });
        }
        partner.partner.push(userId);
        await partner.save();
        const message = `🪓 Hail! ${user.name} has answered your call. Destiny binds you now — begin your saga in chat! 🔥`;
        await notificationService.sendNotification(partner, message, "info");

        // Send match notification to the user
        await sendMatchNotification( partner , user );
        return res.status(200).json({ message: "Request accepted successfully", user , request });


        
    } catch (error) {
        console.error("Error in requestAccepter:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
        

        
    }
}
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
        if (isAlreadyRequested) {
            return res.status(400).json({ message: "Request already sent" });
        }
        const request = await Request.create({
            sender: userId,
            receiver: partnerId,
            status: "pending"
        });
        const message = `🪓 Hail! Request Sent Successfully to ${partner.name}`;
        await notificationService.sendNotification(user, message, "info");
        const partnerMessage = `🪓 Hail! You have a new request from ${user.name}`;
        await notificationService.sendNotification(partner, partnerMessage, "info" );
        
        if (!request) {
            return res.status(404).json({ message: "Request not created" });
        }
        
        
        return res.status(200).json({ message: "Request sent successfully", user , request });

        
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });

        
    }
}   

exports.getRequests = async (req, res) => {
  try {
    const { userId } = req.params;

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
        const userGym = await Gym.findById(senderUser.gym).lean();
        const userGymName = userGym ? userGym.name : "";
        const receiverGym = await Gym.findById(request.receiver.gym).lean();
        const receiverGymName = receiverGym ? receiverGym.name : "";
        const receiverUser = await User.findById(request.receiver._id).lean();

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


