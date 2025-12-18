import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD (IST)
    required: true
  },
  checkIn: String, // HH:MM AM/PM format
  checkOut: String, // HH:MM AM/PM format
  status: {
    type: String,
    enum: ["PRESENT", "HALF_DAY", "LATE", "ABSENT", "OUT"],
    default: "ABSENT"
  },
  scanStatus: {
    type: String,
    enum: ["IN", "OUT", "NONE"],
    default: "NONE"
  }
}, { timestamps: true });

// Compound index for efficient queries
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

export default mongoose.model("Attendance", attendanceSchema);
