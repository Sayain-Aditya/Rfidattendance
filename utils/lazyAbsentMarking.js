import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { getISTDate } from "./attendanceUtils.js";

let lastCheckedDate = null;

export const checkAndMarkAbsent = async () => {
  try {
    const today = getISTDate();
    
    // Only run once per day
    if (lastCheckedDate === today) return;
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Mark absent for yesterday
    const employees = await User.find({ role: "Employee" });
    
    for (const employee of employees) {
      const existingRecord = await Attendance.findOne({
        user: employee._id,
        date: yesterdayStr
      });
      
      if (!existingRecord) {
        await Attendance.create({
          user: employee._id,
          date: yesterdayStr,
          status: "ABSENT",
          scanStatus: "NONE"
        });
      }
    }
    
    lastCheckedDate = today;
    console.log(`✅ Lazy absent marking completed for ${yesterdayStr}`);
  } catch (error) {
    console.error("❌ Lazy absent marking error:", error);
  }
};