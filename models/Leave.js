import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  },
  adminResponse: String
}, { timestamps: true });

leaveSchema.index({ user: 1 });
leaveSchema.index({ status: 1 });

export default mongoose.model("Leave", leaveSchema);