import Attendance from "../models/Attendance.js";

/**
 * LAZY ATTENDANCE RESOLVER
 * Fills missing attendance records as ABSENT for a specific user
 */

/**
 * Get IST date in YYYY-MM-DD format
 */
const getISTDate = () => {
  return new Date().toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

/**
 * Get IST time in HH:MM AM/PM format
 */
export const getISTTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

/**
 * Generate array of dates between start and end (inclusive)
 */
const getDateRange = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * CORE LAZY ATTENDANCE FUNCTION
 * Resolves missing attendance records for a user
 */
export const resolveLazyAttendance = async (userId) => {
  try {
    // Get today's date in IST
    const today = getISTDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Find user's last attendance record
    const lastAttendance = await Attendance.findOne({ user: userId })
      .sort({ date: -1 })
      .limit(1);

    if (!lastAttendance) {
      // No previous records, nothing to backfill
      return;
    }

    // Get all dates between last attendance and yesterday
    const missingDates = getDateRange(
      new Date(lastAttendance.date).toISOString().split('T')[0], 
      yesterdayStr
    );

    // Remove the last attendance date (already exists)
    missingDates.shift();

    // Create absent records for missing dates
    const absentRecords = [];
    for (const date of missingDates) {
      // Check if record already exists
      const exists = await Attendance.findOne({ user: userId, date });
      
      if (!exists) {
        absentRecords.push({
          user: userId,
          date,
          status: "ABSENT",
          scanStatus: "NONE"
        });
      }
    }

    // Bulk insert absent records
    if (absentRecords.length > 0) {
      await Attendance.insertMany(absentRecords);
      console.log(`✅ Lazy marked ${absentRecords.length} absent days for user ${userId}`);
    }

  } catch (error) {
    console.error("❌ Lazy attendance error:", error);
  }
};

/**
 * Determine attendance status based on check-in time
 */
export const getAttendanceStatus = (checkInTime) => {
  if (!checkInTime) return "ABSENT";
  
  // Convert time to minutes for comparison
  const timeToMinutes = (timeStr) => {
    let [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    
    if (period && period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period && period.toUpperCase() === "AM" && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  const checkInMinutes = timeToMinutes(checkInTime);
  const presentCutoff = timeToMinutes("09:30 AM");
  const halfDayCutoff = timeToMinutes("11:00 AM");
  
  if (checkInMinutes <= presentCutoff) {
    return "PRESENT";
  } else if (checkInMinutes <= halfDayCutoff) {
    return "HALF_DAY";
  } else {
    return "LATE";
  }
};

/**
 * Normalize UID for flexible matching
 */
export const normalizeUID = (uid) => {
  return uid.replace(/\s+/g, "").toUpperCase();
};

/**
 * Create regex for UID matching with optional spaces
 */
export const createUIDRegex = (uid) => {
  const cleanUID = normalizeUID(uid);
  const pattern = cleanUID.split("").join("\\s*");
  return new RegExp(pattern, "i");
};