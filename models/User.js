import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  uid: { type: String, required: true, unique: true },
  role: { type: String, default: "Employee" },
  currentShift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    default: null
  }
});

export default mongoose.model("User", userSchema);
