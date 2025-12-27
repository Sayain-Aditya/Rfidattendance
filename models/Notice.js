import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
    default: "MEDIUM"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

noticeSchema.index({ isActive: 1 });
noticeSchema.index({ priority: 1 });

export default mongoose.model("Notice", noticeSchema);