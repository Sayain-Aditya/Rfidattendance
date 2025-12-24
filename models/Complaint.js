import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["OPEN", "IN_PROGRESS", "RESOLVED"],
    default: "OPEN"
  },
  adminResponse: String
}, { timestamps: true });

complaintSchema.index({ user: 1 });
complaintSchema.index({ status: 1 });

export default mongoose.model("Complaint", complaintSchema);