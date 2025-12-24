import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  uid: { type: String, required: true, unique: true },
  role: { type: String, default: "Employee" },
  currentShift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    default: null
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
