import mongoose from "mongoose";

const uidMasterSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "DELETED"],
    default: "Inactive"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  addedBy: {
    type: String,
    default: "Admin"
  }
}, { timestamps: true });

export default mongoose.model("UidMaster", uidMasterSchema);