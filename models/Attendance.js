import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  checkIn: String,
  checkOut: String,
  status: {
    type: String,
    enum: ["IN", "OUT"],
    default: "IN"
  }
});

export default mongoose.model("Attendance", attendanceSchema);
