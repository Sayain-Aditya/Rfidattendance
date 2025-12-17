import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ Database Error:", err.message);
    throw err;
  }
};

export default connectDB;
