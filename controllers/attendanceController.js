import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

// ================= GET ALL ATTENDANCE =================
export const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("user", "name uid")
      .sort({ date: -1 });

    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= SCAN CARD =================
export const scanCard = async (req, res) => {
  try {
    let { uid, deviceTime } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID required" });
    }

    // ================= UID NORMALIZE =================
    const cleanUID = uid.replace(/\s+/g, "").toUpperCase();

    const user = await User.findOne({
      uid: { $regex: new RegExp(cleanUID.split("").join("\\s*"), "i") }
    });

    // ❌ INVALID CARD
    if (!user) {
      return res.json({
        success: false,
        type: "INVALID",
        message: "Invalid Card"
      });
    }

    // ================= DATE & TIME =================
    let date, timeNow;

    if (deviceTime) {
      // deviceTime format: "2025-12-18 09:12 AM"
      const parts = deviceTime.split(" ");
      date = parts[0];
      timeNow = parts.slice(1).join(" ");
    } else {
      // fallback → server IST
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      date = ist.toISOString().split("T")[0];
      timeNow = ist.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }

    // ================= FIND TODAY =================
    let attendance = await Attendance.findOne({
      user: user._id,
      date
    });

    // 🟢 FIRST SCAN (AUTO RESET EVERY DAY)
    if (!attendance) {
      attendance = await Attendance.create({
        user: user._id,
        date,
        checkIn: timeNow,
        status: "IN"
      });

      return res.json({
        success: true,
        type: "IN",
        name: user.name,
        time: timeNow,
        message: "Check-In Successful"
      });
    }

    // 🔵 SECOND SCAN
    if (attendance.status === "IN") {
      attendance.checkOut = timeNow;
      attendance.status = "OUT";
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        name: user.name,
        time: timeNow,
        message: "Check-Out Successful"
      });
    }

    // 🔴 ALREADY COMPLETED
    return res.json({
      success: false,
      type: "DONE",
      message: "Attendance already completed for today"
    });

  } catch (err) {
    console.error("SCAN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
