import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String,
    required: true
  },
  checkIn: String,
  checkOut: String,
  lastScanAt: {
    type: Date,
    default: null
  },
  workMinutes: {
    type: Number,
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["IN", "OUT", "PRESENT", "ABSENT", "HALF_DAY", "LATE"],
    default: "ABSENT"
  },
  scanStatus: {
    type: String,
    enum: ["IN", "OUT", "NONE"],
    default: "NONE"
  }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ date: -1, createdAt: -1 });
attendanceSchema.index({ user: 1, date: -1, createdAt: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ user: 1 });

export default mongoose.model("Attendance", attendanceSchema);
