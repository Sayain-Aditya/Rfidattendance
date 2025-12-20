import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String,
    required: true,
    index: false
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
  status: {
    type: String,
    enum: ["IN", "OUT", "HALF_DAY", "PRESENT", "ABSENT"],
    default: "ABSENT"
  },
  scanStatus: {
    type: String,
    enum: ["IN", "OUT", "NONE"],
    default: "NONE"
  }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });

export default mongoose.model("Attendance", attendanceSchema);