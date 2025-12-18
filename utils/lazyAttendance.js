import Attendance from "../models/Attendance.js";

/**
 * ENTERPRISE LAZY ATTENDANCE RESOLVER
 * Handles holidays, leaves, and absent marking
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
 * Generate date range between two dates
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
 * CORE LAZY ATTENDANCE RESOLVER
 * Resolves missing attendance records with business logic
 */
export const resolveLazyAttendance = async (userId, uptoDate = null) => {
  try {
    const targetDate = uptoDate || getISTDate();
    
    // Find user's last attendance record
    const lastAttendance = await Attendance.findOne({ user: userId })
      .sort({ date: -1 })
      .limit(1);

    if (!lastAttendance) {
      return; // No previous records
    }

    // Get missing dates
    const lastDate = new Date(lastAttendance.date);
    lastDate.setDate(lastDate.getDate() + 1); // Start from day after last record
    
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate > yesterday) {
      return; // No missing dates
    }

    const missingDates = getDateRange(
      lastDate.toISOString().split('T')[0],
      yesterday.toISOString().split('T')[0]
    );

    // Process each missing date
    const recordsToInsert = [];
    
    for (const date of missingDates) {
      // Skip if record already exists
      const exists = await Attendance.findOne({ user: userId, date });
      if (exists) continue;

      recordsToInsert.push({
        user: userId,
        date,
        status: "ABSENT",
        scanStatus: "NONE"
      });
    }

    // Bulk insert records
    if (recordsToInsert.length > 0) {
      await Attendance.insertMany(recordsToInsert);
      console.log(`✅ Lazy resolved ${recordsToInsert.length} attendance records for user ${userId}`);
    }

  } catch (error) {
    console.error("❌ Lazy attendance resolver error:", error);
  }
};

/**
 * Attendance status rules based on check-in time
 */
export const getAttendanceStatus = (checkInTime) => {
  if (!checkInTime) return "ABSENT";
  
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
  } else {
    return "HALF_DAY";
  }
};

/**
 * Salary calculation multipliers
 */
export const getSalaryMultiplier = (status) => {
  const multipliers = {
    "PRESENT": 1,
    "HALF_DAY": 0.5,
    "ABSENT": 0
  };
  
  return multipliers[status] || 0;
};

/**
 * UID utilities for flexible matching
 */
export const normalizeUID = (uid) => {
  return uid.replace(/\s+/g, "").toUpperCase();
};

export const createUIDRegex = (uid) => {
  const cleanUID = normalizeUID(uid);
  const pattern = cleanUID.split("").join("\\s*");
  return new RegExp(pattern, "i");
};