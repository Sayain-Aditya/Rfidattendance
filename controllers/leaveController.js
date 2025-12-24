import Leave from "../models/Leave.js";
import User from "../models/User.js";

export const submitLeave = async (req, res) => {
  try {
    const { userId, startDate, endDate, reason } = req.body;

    if (!userId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const leave = await Leave.create({
      user: userId,
      startDate,
      endDate,
      reason
    });

    res.json({
      success: true,
      message: "Leave application submitted successfully",
      leave
    });
  } catch (error) {
    console.error("Submit Leave Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit leave application"
    });
  }
};

export const getLeaves = async (req, res) => {
  try {
    const { userId } = req.query;
    
    const query = userId ? { user: userId } : {};
    
    const leaves = await Leave.find(query)
      .populate("user", "name uid")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error("Get Leaves Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaves"
    });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, adminResponse } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      leaveId,
      { status, adminResponse },
      { new: true }
    ).populate("user", "name uid");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found"
      });
    }

    res.json({
      success: true,
      message: "Leave status updated successfully",
      leave
    });
  } catch (error) {
    console.error("Update Leave Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update leave status"
    });
  }
};