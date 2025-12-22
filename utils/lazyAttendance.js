import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { getISTDate } from "./istTime.js";

export const normalizeUID = (uid) => {
  return uid.replace(/\s+/g, "").toUpperCase();
};

export const createUIDRegex = (uid) => {
  const cleanUID = normalizeUID(uid);
     const pattern = cleanUID.split("").join("\\s*");
  return new RegExp(pattern, "i");
};

export const lazyMarkAbsent = async () => {
  try {
    const today = getISTDate();
       const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const employees = await User.find({ role: "Employee" });
    
    let markedCount = 0;
    
    for (const employee of employees) {
      const existingAttendance = await Attendance.findOne({
        user: employee._id,
        date: yesterdayStr
      });
      
      if (!existingAttendance) {
        await Attendance.create({
          user: employee._id,
              date: yesterdayStr,
          status: "ABSENT",
          scanStatus: "NONE",
              workMinutes: 0
        });
        markedCount++;
      } 
    }
    
    console.log(`✅ Lazy marked ${markedCount} users as ABSENT for ${yesterdayStr}`);
    return markedCount;
    
       } catch (error) {
        console.error("❌ Lazy mark absent error:", error);
    return 0;
  }
};

export const fillMissingAttendance = async (userId, startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    for (const date of dates) {
      const exists = await Attendance.findOne({ user: userId, date });
      
         if (!exists) {
           await Attendance.create({
          user: userId,
          date,
          status: "ABSENT",
          scanStatus: "NONE",
          workMinutes: 0
        });
      }
    }
    
  } catch (error) {
        console.error("❌ Fill missing attendance error:", error);
     }
};