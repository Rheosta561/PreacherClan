const mongoose = require('mongoose');

const GymSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    image: { type: String,  },
    profileImage: { type: String,  },
    gallery : [{type: String}],
    description: { type: String, required: true },
    rating: { type: Number, required: true },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    address : {
        country : {type: String} , 
        state : {type:String},
        city : {type : String},
        lattitude : {type: Number},
        longitude : {type : Number},
    },
    contact : {
        email : {type : String},
        phone : {type:Number },
    },
    facilities: [{ type: String, }],
    equipment: [{ type: String, }],
    membership: {
  monthly: { type: Number },
  quarterly: { type: Number },   // 3 months
  halfYearly: { type: Number },  // 6 months
  yearly: { type: Number },
},

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    trainers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    memberSince: { type: Date, required: true },
    gymCode:{type:String , required:true},
    featured : {type : Boolean}
});

const Gym = mongoose.model("Gym", GymSchema);



module.exports = Gym;