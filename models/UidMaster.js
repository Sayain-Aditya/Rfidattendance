import mongoose from "mongoose";

const uidMasterSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  isUsed: {
    type: Boolean,
    default: false
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

uidMasterSchema.index({ isUsed: 1 });

export default mongoose.model("UidMaster", uidMasterSchema);