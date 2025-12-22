import User from "../models/User.js";
import UidMaster from "../models/UidMaster.js";

export const registerUser = async (req, res) => {
  try {
    const { name, uid } = req.body;

    if (!name || !uid) {
      return res.status(400).json({ 
        success: false,
        message: "Name and UID are required" 
      });
    }


    const uidMaster = await UidMaster.findOne({ uid, isUsed: false });
    if (!uidMaster) {
      return res.status(400).json({ 
        success: false,
        message: "UID not found in master or already used" 
      });
    }


    const exists = await User.findOne({ uid });
    if (exists) {
      return res.status(400).json({ 
        success: false,
        message: "UID already registered" 
      });
    }


    const user = await User.create({ name, uid });


    uidMaster.isUsed = true;
    uidMaster.assignedTo = user._id;
    await uidMaster.save();

    res.json({ 
      success: true,
      message: "User Registered", 
      user 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { name, uid } = req.body;

    const exists = await User.findOne({ uid });
    if (exists) {
      return res.status(400).json({ message: "UID already registered" });
    }

    const user = await User.create({ name, uid, role: "Admin" });

    res.json({ message: "Admin Registered", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { uid } = req.body;

    const user = await User.findOne({ uid, role: "Admin" });
    if (!user) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    res.json({ message: "Admin login successful", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    
    const query = role ? { role } : {};
    
    const users = await User.find(query)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: users.length
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, currentShift } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    if (currentShift !== undefined) user.currentShift = currentShift;

    await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await UidMaster.updateOne(
      { assignedTo: userId },
      { $set: { isUsed: false, assignedTo: null } }
    );

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};