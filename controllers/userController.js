import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";


// ================= SIGNUP =================
export const signup = async (req, res) => {

  try {

    const { fullName, email, password, bio } = req.body;

    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ success: false, message: "Account already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio
    });

    const token = generateToken(newUser._id);

    const userData = await User.findById(newUser._id).select("-password");

    res.json({
      success: true,
      userData,
      token,
      message: "Account created successfully"
    });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= LOGIN =================
export const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const userData = await User.findOne({ email });

    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);

    const user = await User.findById(userData._id).select("-password");

    res.json({
      success: true,
      userData: user,
      token,
      message: "Login successful"
    });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= CHECK AUTH =================
export const checkAuth = (req, res) => {

  res.json({
    success: true,
    user: req.user
  });

};


// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {

  try {

    const { profilePic, bio, fullName } = req.body;

    const userId = req.user._id;

    let updatedUser;

    if (!profilePic) {

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      ).select("-password");

    } else {

      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profilePic: upload.secure_url,
          bio,
          fullName
        },
        { new: true }
      ).select("-password");

    }

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};


// ================= UPDATE LAST SEEN =================
export const updateLastSeen = async (req, res) => {

  try {

    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date(),
      isOnline: false
    });

    res.json({ success: true });

  } catch (error) {

    console.log(error.message);
    res.json({ success: false, message: error.message });

  }

};