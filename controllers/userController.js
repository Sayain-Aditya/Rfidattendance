import User from "../models/User.js";
import UidMaster from "../models/UidMaster.js";
import { getNextEmployeeId, peekNextEmployeeId } from "../services/employeeService.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, address, phoneNumber, uid, role = 'Employee' } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    if (!name || !email || !password || !address || !phoneNumber || !uid) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    const uidMaster = await UidMaster.findOne({ uid, status: "Inactive" });
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

    const employeeId = await getNextEmployeeId();
    const user = await User.create({ name, email, password, address, phoneNumber, uid, role, profileImage, employeeId });

    uidMaster.status = "Active";
    uidMaster.assignedTo = user._id;
    await uidMaster.save();

    res.json({ 
      success: true,
      message: "User Registered", 
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        address: user.address,
        uid: user.uid,
        role: user.role,
        profileImage: user.profileImage
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
    const { email, password, employeeId } = req.body;

    let user;
    
    if (employeeId) {
      // login with employee id employees only
      user = await User.findOne({ employeeId, password, role: "Employee" });
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid employee credentials" 
        });
      }
    } else if (email) {
      // Login with email admins only
      user = await User.findOne({ email, password, role: "Admin" });
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid admin credentials" 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false,
        message: "Email or Employee ID is required" 
      });
    }

    res.json({ 
      success: true,
      message: "Login successful", 
      user: {
        _id: user._id,
        employeeId: user.employeeId,
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
    const { name, email, address, phoneNumber, currentShift } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (currentShift !== undefined) user.currentShift = currentShift;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        uid: user.uid,
        role: user.role,
        profileImage: user.profileImage
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
      { $set: { status: "Inactive" }, $unset: { assignedTo: 1 } }
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

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newUid } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const newStatus = !user.isActive;

    if (newStatus === false) {
      // deactivating User
      await UidMaster.updateOne(
        { uid: user.uid },
        { $set: { status: "Inactive" }, $unset: { assignedTo: 1 } }
      );
    } else {
      // activating user
      if (!newUid) {
        return res.status(400).json({
          success: false,
          message: "New UID is required to activate user"
        });
      }

      // check if new uids exists and is available
      const uidMaster = await UidMaster.findOne({ uid: newUid, status: "Inactive" });
      if (!uidMaster) {
        return res.status(400).json({
          success: false,
          message: "UID not found in master or already used"
        });
      }

      // check if uid is Already assigned to another User
      const uidExists = await User.findOne({ uid: newUid });
      if (uidExists) {
        return res.status(400).json({
          success: false,
          message: "UID already assigned to another user"
        });
      }

      // update user with new uid and register it
      user.uid = newUid;
      await UidMaster.updateOne(
        { uid: newUid },
        { $set: { status: "Active", assignedTo: user._id } }
      );
    }

    user.isActive = newStatus;
    await user.save();

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        uid: user.uid,
        isActive: user.isActive
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getNextEmployeeIdAPI = async (req, res) => {
  try {
    const nextEmployeeId = await peekNextEmployeeId();
    
    res.json({
      success: true,
      nextEmployeeId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};     