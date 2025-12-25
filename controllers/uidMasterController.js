import UidMaster from "../models/UidMaster.js";
import User from "../models/User.js";

export const addUID = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    const existingUID = await UidMaster.findOne({ uid });
    if (existingUID) {
      return res.status(400).json({
        success: false,
        message: "UID already exists in master"
      });
    }

    const uidMaster = await UidMaster.create({ uid });

    res.json({
      success: true,
      message: "UID added to master successfully",
      uidMaster
    });
  } catch (error) {
    console.error("❌ Add UID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add UID"
    });
  }
};

export const getAvailableUIDs = async (req, res) => {
  try {
    const uids = await UidMaster.find({ isUsed: false })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      availableUIDs: uids
    });
  } catch (error) {
    console.error("❌ Get Available UIDs Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available UIDs"
    });
  }
};

export const getAllUIDs = async (req, res) => {
  try {
    const uids = await UidMaster.find()
      .populate("assignedTo", "name uid")
      .sort({ createdAt: -1 });

    const formattedUIDs = uids.map(uid => ({
      _id: uid._id,
      uid: uid.uid,
      isUsed: uid.isUsed,
      employeeName: uid.assignedTo ? uid.assignedTo.name : null,
      employeeUID: uid.assignedTo ? uid.assignedTo.uid : null,
      addedBy: uid.addedBy,
      createdAt: uid.createdAt,
      updatedAt: uid.updatedAt
    }));

    res.json({
      success: true,
      uids: formattedUIDs
    });
  } catch (error) {
    console.error("❌ Get All UIDs Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch UIDs"
    });
  }
};

export const updateUID = async (req, res) => {
  try{
    const {uidId} = req.params;
    const {uid} = req.body;

    const uidMaster = await uidMaster.findbyIdUpdate(
      uidId,
      {uid},
      {new:true}
    );
  req.json({
    success:true,
    message:"UID updated successfully",
    uidMaster
  });
} catch(error){
  res.status(500).json({
    success:false,
    message:"Failed to update UID"
  });
}
};

export const deleteUID = async (req, res) => {
  try {
    const { uidId } = req.params;

    const uidMaster = await UidMaster.findById(uidId);
    if (!uidMaster) {
      return res.status(404).json({
        success: false,
        message: "UID not found"
      });
    }

    if (uidMaster.isUsed) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete UID that is already assigned to an employee"
      });
    }

    await UidMaster.findByIdAndDelete(uidId);

    res.json({
      success: true,
      message: "UID deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete UID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete UID"
    });
  }
};