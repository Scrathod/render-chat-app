import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";


// ================= GET USERS FOR SIDEBAR =================
export const getUsersForSidebar = async (req, res) => {
  try {

    const userId = req.user._id;

    const filteredUser = await User.find({ _id: { $ne: userId } }).select("-password");

    const unseenMessages = {};

    const promises = filteredUser.map(async (user) => {

      const count = await Message.countDocuments({
        senderId: user._id,
        receiverId: userId,
        seen: false
      });

      if (count > 0) {
        unseenMessages[user._id] = count;
      }

    });

    await Promise.all(promises);

    res.json({ success: true, users: filteredUser, unseenMessages });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }
};


// ================= GET CHAT MESSAGES =================
export const getMessages = async (req, res) => {

  try {

    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ]
    }).sort({ createdAt: 1 });

    // mark messages as seen
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId },
      { seen: true }
    );

    res.json({ success: true, messages });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= MARK MESSAGE SEEN =================
export const markMessageAsSeen = async (req, res) => {

  try {

    const { id } = req.params;

    await Message.findByIdAndUpdate(id, { seen: true });

    res.json({ success: true });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= SEND MESSAGE =================
export const sendMessage = async (req, res) => {

  try {

    const { text, image } = req.body;

    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl;

    if (image) {

      const uploadResponse = await cloudinary.uploader.upload(image);

      imageUrl = uploadResponse.secure_url;

    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      delivered: false
    });

    const receiverSocketId = userSocketMap[receiverId];

    if (receiverSocketId) {

      io.to(receiverSocketId).emit("newMessage", newMessage);

      // mark delivered
      await Message.findByIdAndUpdate(newMessage._id, { delivered: true });

      io.to(receiverSocketId).emit("messageDelivered", newMessage._id);

    }

    res.json({ success: true, newMessage });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= EDIT MESSAGE =================
export const editMessage = async (req, res) => {

  try {

    const { messageId, text } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { text, edited: true },
      { new: true }
    );

    const receiverSocketId = userSocketMap[message.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", message);
    }

    res.json({ success: true, message });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= DELETE MESSAGE =================
export const deleteMessage = async (req, res) => {

  try {

    const { messageId } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { deleted: true },
      { new: true }
    );

    const receiverSocketId = userSocketMap[message.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }

    res.json({ success: true });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= MESSAGE REACTION =================
export const reactToMessage = async (req, res) => {

  try {

    const { messageId, emoji } = req.body;

    const userId = req.user._id;

    const message = await Message.findById(messageId);

    message.reactions.push({
      userId,
      emoji
    });

    await message.save();

    const receiverSocketId = userSocketMap[message.receiverId];

    if (receiverSocketId) {

      io.to(receiverSocketId).emit("messageReaction", {
        messageId,
        userId,
        emoji
      });

    }

    res.json({ success: true });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};