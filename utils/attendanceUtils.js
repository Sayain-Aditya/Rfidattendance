/**
 * ENTERPRISE ATTENDANCE BUSINESS LOGIC
 * Handles time calculations, status determination, and UID normalization
 */

// Business Rules Configuration
const ATTENDANCE_RULES = {
  PRESENT_CUTOFF: "09:30", // Check-in ≤ 09:30 AM → PRESENT
  HALF_DAY_CUTOFF: "11:00", // 09:31 – 11:00 AM → HALF_DAY
  LATE_CUTOFF: "11:01" // After 11:00 AM → LATE
};

/**
 * Get current IST date in YYYY-MM-DD format
 */
export const getISTDate = () => {
  return new Date().toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

/**
 * Get current IST time in HH:MM AM/PM format
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
 * Normalize UID - remove spaces and convert to uppercase
 * Supports matching UIDs with or without spaces
 */
export const normalizeUID = (uid) => {
  return uid.replace(/\s+/g, "").toUpperCase();
};

/**
 * Convert time string to minutes for comparison
 * Supports both 12-hour (09:30 AM) and 24-hour (09:30) formats
 */
const timeToMinutes = (timeStr) => {
  let [time, period] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  
  if (period) {
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
  }
  
  return hours * 60 + minutes;
};

/**
 * Determine attendance status based on check-in time
 * Rules:
 * - Check-in ≤ 09:30 AM → PRESENT
 * - 09:31 – 11:00 AM → HALF_DAY  
 * - After 11:00 AM → LATE
 */
export const getAttendanceStatus = (checkInTime) => {
  if (!checkInTime) return "ABSENT";
  
  const checkInMinutes = timeToMinutes(checkInTime);
  const presentCutoff = timeToMinutes(ATTENDANCE_RULES.PRESENT_CUTOFF);
  const halfDayCutoff = timeToMinutes(ATTENDANCE_RULES.HALF_DAY_CUTOFF);
  
  if (checkInMinutes <= presentCutoff) {
    return "PRESENT";
  } else if (checkInMinutes <= halfDayCutoff) {
    return "HALF_DAY";
  } else {
    return "LATE";
  }
};

/**
 * Create regex pattern for flexible UID matching
 * Allows matching UIDs with or without spaces
 */
export const createUIDRegex = (uid) => {
  const cleanUID = normalizeUID(uid);
  // Create pattern that matches with optional spaces between characters
  const pattern = cleanUID.split("").join("\\s*");
  return new RegExp(pattern, "i");
};