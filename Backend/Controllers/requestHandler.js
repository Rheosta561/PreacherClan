const User = require("../Models/User");
const Request = require("../Models/Requests");
const { sendNotification } = require("../Utils/NotificationService");

async function notifyRepMate(user, message, title, pushType, pushData) {
    try {
        await sendNotification(user, message, title, "info", pushType, pushData);
    } catch (error) {
        console.error("RepMate notification failed:", error.message);
    }
}

async function linkRepMates(userId, partnerId) {
    const [user, partner] = await Promise.all([
        User.findByIdAndUpdate(userId, { $addToSet: { partner: partnerId } }, { new: true }),
        User.findByIdAndUpdate(partnerId, { $addToSet: { partner: userId } }, { new: true }),
    ]);

    if (!user || !partner) {
        throw new Error("Could not update both RepMate profiles");
    }

    await Request.updateMany(
        {
            status: "pending",
            $or: [
                { sender: userId, receiver: partnerId },
                { sender: partnerId, receiver: userId },
            ],
        },
        { $set: { status: "accepted" } },
    );

    return { user, partner };
}

exports.requestAccepter = async (req, res) => {
    try {
        const { userId, requestId } = req.params;
        const request = await Request.findOne({
            _id: requestId,
            receiver: userId,
            status: "pending",
        });

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        const { user, partner } = await linkRepMates(userId, request.sender);
        await notifyRepMate(partner, `${user.name} accepted your RepMate request. You are now connected.`, "RepMate request accepted", "repmate_matched", { userId: user._id });
        await notifyRepMate(user, `You and ${partner.name} are now RepMates.`, "RepMate match", "repmate_matched", { userId: partner._id });
        return res.status(200).json({
            message: "Request accepted successfully",
            matched: true,
            user,
            partner: { _id: partner._id, name: partner.name },
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.requestRejecter = async (req, res) => {
    try {
        const { userId, requestId } = req.params;
        const request = await Request.findOneAndUpdate(
            { _id: requestId, receiver: userId, status: "pending" },
            { $set: { status: "rejected" } },
            { new: true },
        );

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        return res.status(200).json({ message: "Request rejected successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.requestSender = async (req, res) => {
    try {
        const { userId, partnerId } = req.params;

        if (String(userId) === String(partnerId)) {
            return res.status(400).json({ message: "You cannot request yourself" });
        }

        const [partner, user] = await Promise.all([
            User.findById(partnerId),
            User.findById(userId),
        ]);
        if (!partner || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        const alreadyConnected = (user.partner || []).some((id) => String(id) === String(partnerId));
        if (alreadyConnected) {
            return res.status(200).json({
                message: "You are already RepMates",
                matched: true,
                alreadyMatched: true,
                partner: { _id: partner._id, name: partner.name },
            });
        }

        const reciprocalRequest = await Request.findOne({
            sender: partnerId,
            receiver: userId,
            status: "pending",
        });

        if (reciprocalRequest) {
            const { user: updatedUser, partner: updatedPartner } = await linkRepMates(userId, partnerId);
            await notifyRepMate(updatedPartner, `You and ${updatedUser.name} are now RepMates.`, "RepMate match", "repmate_matched", { userId: updatedUser._id });
            await notifyRepMate(updatedUser, `You and ${updatedPartner.name} are now RepMates.`, "RepMate match", "repmate_matched", { userId: updatedPartner._id });
            return res.status(200).json({
                message: "RepMate request accepted. You are now connected.",
                matched: true,
                user: updatedUser,
                partner: { _id: updatedPartner._id, name: updatedPartner.name },
            });
        }

        const existingRequest = await Request.findOne({
            sender: userId,
            receiver: partnerId,
            status: "pending",
        });
        if (existingRequest) {
            return res.status(400).json({ message: "Request already sent" });
        }

        const request = await Request.create({
            sender: userId,
            receiver: partnerId,
            status: "pending",
        });

        // A reverse request can arrive while this request is being created.
        const arrivedReciprocalRequest = await Request.findOne({
            sender: partnerId,
            receiver: userId,
            status: "pending",
        });
        if (arrivedReciprocalRequest) {
            const { user: updatedUser, partner: updatedPartner } = await linkRepMates(userId, partnerId);
            await notifyRepMate(updatedPartner, `You and ${updatedUser.name} are now RepMates.`, "RepMate match", "repmate_matched", { userId: updatedUser._id });
            await notifyRepMate(updatedUser, `You and ${updatedPartner.name} are now RepMates.`, "RepMate match", "repmate_matched", { userId: updatedPartner._id });
            return res.status(200).json({
                message: "RepMate request accepted. You are now connected.",
                matched: true,
                user: updatedUser,
                partner: { _id: updatedPartner._id, name: updatedPartner.name },
            });
        }

        await notifyRepMate(partner, `${user.name} sent you a RepMate request.`, "New RepMate request", "repmate_request", { userId: user._id, requestId: request._id });

        return res.status(200).json({
            message: "Request sent successfully",
            matched: false,
            request,
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getRequests = async (req, res) => {
    try {
        const { userId } = req.params;
        const requests = await Request.find({
            $or: [{ receiver: userId }, { sender: userId }],
            status: "pending",
        })
            .populate({ path: "sender", populate: [{ path: "profile" }, { path: "gym", select: "_id name" }] })
            .populate({ path: "receiver", populate: [{ path: "profile" }, { path: "gym", select: "_id name" }] })
            .sort({ createdAt: -1 });

        return res.status(200).json({ requests });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
