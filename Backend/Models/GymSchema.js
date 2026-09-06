const mongoose = require('mongoose');

const GymSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    image: { type: String,  },
    profileImage: { type: String,  },
    description: { type: String, required: true },
    rating: { type: Number, required: true },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    facilities: [{ type: String, }],
    equipment: [{ type: String, }],
    membership: [{ type: String, }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    memberSince: { type: Date, required: true },
    gymCode:{type:String , required:true}
});

const Gym = mongoose.model("Gym", GymSchema);



module.exports = Gym;