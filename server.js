import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

// Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Socket.IO server
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store connected users
export const userSocketMap = {}; // { userId: socketId }

// Socket connection
io.on("connection", (socket) => {

  const userId = socket.handshake.query.userId;

  console.log("User Connected:", userId, "Socket:", socket.id);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Send online users to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    const receiverSocketId = userSocketMap[data.receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", data);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {

    console.log("User Disconnected:", userId);

    if (userId) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

});


// Middleware
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Health check route
app.get("/api/status", (req, res) => {
  res.send("Server is live");
});

// API routes
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);


// Start server
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