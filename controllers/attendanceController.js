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
    const { uid } = req.body;

    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ message: "User not registered" });
    }

    const today = new Date().toISOString().split("T")[0];
    let attendance = await Attendance.findOne({ user: user._id, date: today });
    const timeNow = new Date().toLocaleTimeString("en-IN", {
      hour12: false,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        user: user._id,
        date: today,
        checkIn: timeNow,
      });

      return res.json({ message: "Check-In Done", name: user.name, checkIn: timeNow });
    }

    attendance.checkOut = timeNow;
    await attendance.save();

    return res.json({ message: "Check-Out Done", name: user.name, checkOut: timeNow });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};