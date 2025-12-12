import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  uid: { type: String, required: true, unique: true },
  role: { type: String, default: "Employee" },
});

export default mongoose.model("User", userSchema);
