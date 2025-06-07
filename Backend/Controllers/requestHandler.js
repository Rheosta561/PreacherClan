const User = require("../Models/User");
const Request = require("../Models/Requests");


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
        return res.status(200).json({ message: "Request accepted successfully", user });


        
    } catch (error) {
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
        
        if (!request) {
            return res.status(404).json({ message: "Request not created" });
        }
        
        
        return res.status(200).json({ message: "Request sent successfully", user });

        
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });

        
    }
}   

exports.getRequests = async(req,res) =>{
    try {
        const {userId} = req.params;
        const requests = await Request.find({
            receiver: userId,
            status: "pending"
        }).populate('sender');
        
        if (!requests) {
            return res.status(404).json({ message: "No requests found" });
        }
        
        return res.status(200).json({ requests });

        
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });

        
    }
}

