import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  text: {
    type: String
  },

  image: {
    type: String
  },

  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text"
  },

  seen: {
    type: Boolean,
    default: false
  },

  delivered: {
    type: Boolean,
    default: false
  },

  edited: {
    type: Boolean,
    default: false
  },

  deleted: {
    type: Boolean,
    default: false
  },

  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null
  },

  reactions: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      emoji: {
        type: String
      }
    }
  ]

}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;