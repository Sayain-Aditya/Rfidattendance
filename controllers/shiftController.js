import Shift from "../models/Shift.js";
import User from "../models/User.js";

export const createShift = async (req, res) => {
  try {
    const { userId, shiftName, startTime, endTime, graceMinutes = 15, minimumHours = 4 } = req.body;

    if (!userId || !shiftName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const shift = await Shift.create({
      user: userId,
      shiftName,
      startTime,
      endTime,
      graceMinutes,
      minimumHours
    });

    res.json({
      success: true,
      message: "Shift created successfully",
      shift
    });
  } catch (error) {
    console.error("❌ Create Shift Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create shift"
    });
  }
};

export const assignShift = async (req, res) => {
  try {
    const { userId, shiftId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    user.currentShift = shiftId;
    await user.save();

    res.json({
      success: true,
      message: "Shift assigned successfully"
    });
  } catch (error) {
    console.error("❌ Assign Shift Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign shift"
    });
  }
};

export const getUserShifts = async (req, res) => {
  try {
    const { userId } = req.params;

    const shifts = await Shift.find({ user: userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    console.error("❌ Get User Shifts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shifts"
    });
  }
};

export const getAllShifts = async (req, res) => {
  try {
    const shifts = await Shift.find({ isActive: true })
      .populate("user", "name uid")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    console.error("❌ Get All Shifts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shifts"
    });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { shiftName, startTime, endTime, graceMinutes, minimumHours } = req.body;

    const shift = await Shift.findByIdAndUpdate(
      shiftId,
      { shiftName, startTime, endTime, graceMinutes, minimumHours },
      { new: true }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    res.json({
      success: true,
      message: "Shift updated successfully",
      shift
    });
  } catch (error) {
    console.error("❌ Update Shift Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update shift"
    });
  }
};

export const deleteShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shift = await Shift.findByIdAndUpdate(
      shiftId,
      { isActive: false },
      { new: true }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found"
      });
    }

    res.json({
      success: true,
      message: "Shift deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete Shift Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete shift"
    });
  }
};