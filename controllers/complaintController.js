import Complaint from "../models/Complaint.js";
import User from "../models/User.js";

export const submitComplaint = async (req, res) => {
  try {
    const { userId, subject, description } = req.body;

    if (!userId || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const complaint = await Complaint.create({
      user: userId,
      subject,
      description
    });

    res.json({
      success: true,
      message: "Complaint submitted successfully",
      complaint
    });
  } catch (error) {
    console.error("Submit Complaint Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit complaint"
    });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const { userId } = req.query;
    
    const query = userId ? { user: userId } : {};
    
    const complaints = await Complaint.find(query)
      .populate("user", "name uid")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error("Get Complaints Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints"
    });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, adminResponse } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { status, adminResponse },
      { new: true }
    ).populate("user", "name uid");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    res.json({
      success: true,
      message: "Complaint status updated successfully",
      complaint
    });
  } catch (error) {
    console.error("Update Complaint Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update complaint status"
    });
  }
};