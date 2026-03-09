import express from "express";
import { protectRoute } from "../middleware/auth.js";

import {
  getMessages,
  getUsersForSidebar,
  markMessageAsSeen,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage
} from "../controllers/messageController.js";

const messageRouter = express.Router();


// ================= SIDEBAR USERS =================
messageRouter.get("/users", protectRoute, getUsersForSidebar);


// ================= GET CHAT MESSAGES =================
messageRouter.get("/:id", protectRoute, getMessages);


// ================= SEND MESSAGE =================
messageRouter.post("/send/:id", protectRoute, sendMessage);


// ================= MARK MESSAGE SEEN =================
messageRouter.put("/seen/:id", protectRoute, markMessageAsSeen);


// ================= EDIT MESSAGE =================
messageRouter.patch("/edit", protectRoute, editMessage);


// ================= DELETE MESSAGE =================
messageRouter.delete("/delete", protectRoute, deleteMessage);


// ================= MESSAGE REACTION =================
messageRouter.post("/react", protectRoute, reactToMessage);


export default messageRouter;