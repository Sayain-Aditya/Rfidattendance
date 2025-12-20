import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  shiftName: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  graceMinutes: {
    type: Number,
    default: 15
  },
  minimumHours: {
    type: Number,
    default: 4
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

shiftSchema.index({ user: 1 });

export default mongoose.model("Shift", shiftSchema);