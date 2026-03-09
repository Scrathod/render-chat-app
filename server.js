import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import User from "./models/User.js";

const app = express();
const server = http.createServer(app);

// ================= SOCKET.IO =================
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store connected users
export const userSocketMap = {}; // { userId : socketId }


// Helper function
const emitToUser = (userId, event, data) => {
  const socketId = userSocketMap[userId];
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};


// ================= SOCKET CONNECTION =================
io.on("connection", async (socket) => {

  const userId = socket.handshake.query.userId;

  if (!userId) return socket.disconnect();

  console.log("User Connected:", userId, socket.id);

  userSocketMap[userId] = socket.id;

  // Update online status
  await User.findByIdAndUpdate(userId, {
    isOnline: true
  });

  // Broadcast online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));


  // ================= SEND MESSAGE =================
  socket.on("sendMessage", (data) => {

    emitToUser(data.receiverId, "receiveMessage", data);

    // notify sender delivered
    emitToUser(userId, "messageDelivered", {
      messageId: data._id
    });

  });


  // ================= TYPING =================
  socket.on("typing", ({ receiverId }) => {

    emitToUser(receiverId, "typing", {
      senderId: userId
    });

  });


  socket.on("stopTyping", ({ receiverId }) => {

    emitToUser(receiverId, "stopTyping", {
      senderId: userId
    });

  });


  // ================= MESSAGE SEEN =================
  socket.on("messageSeen", ({ senderId, messageId }) => {

    emitToUser(senderId, "messageSeen", { messageId });

  });


  // ================= DELETE MESSAGE =================
  socket.on("deleteMessage", ({ receiverId, messageId }) => {

    emitToUser(receiverId, "messageDeleted", { messageId });

  });


  // ================= REACTION =================
  socket.on("messageReaction", ({ receiverId, messageId, emoji }) => {

    emitToUser(receiverId, "messageReaction", {
      messageId,
      emoji,
      userId
    });

  });


  // ================= DISCONNECT =================
  socket.on("disconnect", async () => {

    console.log("User Disconnected:", userId);

    delete userSocketMap[userId];

    // Update last seen
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date()
    });

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

  });

});


// ================= MIDDLEWARE =================
app.use(express.json({ limit: "4mb" }));
app.use(cors());


// ================= HEALTH CHECK =================
app.get("/api/status", (req, res) => {
  res.send("Server is live");
});


// ================= ROUTES =================
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);


// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {

  try {

    await connectDB();
    console.log("MongoDB Connected");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {

    console.error("Server start error:", error);

  }

};

startServer();