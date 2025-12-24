import User from "../models/User.js";
import UidMaster from "../models/UidMaster.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, address, uid, role = 'Employee' } = req.body;

    if (!name || !email || !password || !address || !uid) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    const uidMaster = await UidMaster.findOne({ uid, isUsed: false });
    if (!uidMaster) {
      return res.status(400).json({ 
        success: false,
        message: "UID not found in master or already used" 
      });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    const uidExists = await User.findOne({ uid });
    if (uidExists) {
      return res.status(400).json({ 
        success: false,
        message: "UID already registered" 
      });
    }

    const user = await User.create({ name, email, password, address, uid, role });

    uidMaster.isUsed = true;
    uidMaster.assignedTo = user._id;
    await uidMaster.save();

    res.json({ 
      success: true,
      message: "User Registered", 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        uid: user.uid,
        role: user.role
      }
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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    res.json({ 
      success: true,
      message: "Login successful", 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        uid: user.uid,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password, role: "Admin" });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid admin credentials" 
      });
    }

    res.json({ 
      success: true,
      message: "Admin login successful", 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        uid: user.uid,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

export const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password, role: "Employee" });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid employee credentials" 
      });
    }

    res.json({ 
      success: true,
      message: "Employee login successful", 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        uid: user.uid,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
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
    const { name, email, address, currentShift } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;
    if (currentShift !== undefined) user.currentShift = currentShift;

    await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        uid: user.uid,
        role: user.role
      }
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
      { uid: user.uid },
      { $set: { isUsed: false }, $unset: { assignedTo: 1 } }
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