const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'gif', 'sticker'],
      default: 'text',
    },
    content: {
      type: String, 
    },
    media: [
      {
        public_id: String,
        url: String,
        type: String, 
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Message',
  default: null
}

  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
