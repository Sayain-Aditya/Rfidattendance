import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  checkIn: { type: String },
  checkOut: { type: String }
});

export default mongoose.model("Attendance", attendanceSchema);