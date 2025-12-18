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
  checkIn: String,
  checkOut: String,
  status: {
    type: String,
    enum: ["IN", "OUT"],
    default: "IN"
  }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
