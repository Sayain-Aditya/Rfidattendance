import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

export const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('user', 'name uid')
      .sort({ date: -1 });

    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const scanCard = async (req, res) => {
  try {
    let { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ message: "UID required" });
    }

    // ✅ NORMALIZE UID (remove spaces, uppercase)
    const cleanUID = uid.replace(/\s+/g, "").toUpperCase();

    // ✅ FIND USER (match even if DB has spaces)
    const user = await User.findOne({
      uid: { $regex: new RegExp(cleanUID.split("").join("\\s*"), "i") }
    });

    if (!user) {
      return res.status(404).json({ message: "User not registered" });
    }

    // 📅 Get today's date
    const today = new Date().toISOString().split("T")[0];

    // 📄 Find today's attendance
    let attendance = await Attendance.findOne({
      user: user._id,
      date: today
    });

    const timeNow = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    // 🟢 FIRST SCAN → CHECK IN
    if (!attendance) {
      attendance = await Attendance.create({
        user: user._id,
        date: today,
        checkIn: timeNow,
        status: "IN"
      });

      return res.json({
        success: true,
        type: "IN",
        name: user.name,
        time: timeNow,
        message: "Check-In Done"
      });
    }

    // 🔵 SECOND SCAN → CHECK OUT
    if (attendance.status === "IN") {
      attendance.checkOut = timeNow;
      attendance.status = "OUT";
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        name: user.name,
        time: timeNow,
        message: "Check-Out Done"
      });
    }

    // 🔴 ALREADY DONE
    return res.status(400).json({
      success: false,
      message: "Attendance already completed for today"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

