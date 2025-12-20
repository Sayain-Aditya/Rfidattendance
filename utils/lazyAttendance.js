import Attendance from "../models/Attendance.js";

const getISTDate = () => {
  return new Date().toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

export const getISTTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

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

export const resolveLazyAttendance = async (userId, uptoDate = null) => {
  try {
    const targetDate = uptoDate || getISTDate();
    
    const lastAttendance = await Attendance.findOne({ user: userId })
      .sort({ date: -1 })
      .limit(1);

    if (!lastAttendance) {
      return;
    }

    const lastDate = new Date(lastAttendance.date);
    lastDate.setDate(lastDate.getDate() + 1);
    
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate > yesterday) {
      return;
    }

    const missingDates = getDateRange(
      lastDate.toISOString().split('T')[0],
      yesterday.toISOString().split('T')[0]
    );

    const recordsToInsert = [];
    
    for (const date of missingDates) {
      const exists = await Attendance.findOne({ user: userId, date });
      if (exists) continue;

      recordsToInsert.push({
        user: userId,
        date,
        status: "ABSENT",
        scanStatus: "NONE"
      });
    }

    if (recordsToInsert.length > 0) {
      await Attendance.insertMany(recordsToInsert);
      console.log(`✅ Lazy resolved ${recordsToInsert.length} attendance records for user ${userId}`);
    }

  } catch (error) {
    console.error("❌ Lazy attendance resolver error:", error);
  }
};

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
  
  if (checkInMinutes <= presentCutoff) {
    return "PRESENT";
  } else {
    return "HALF_DAY";
  }
};

export const getSalaryMultiplier = (status) => {
  const multipliers = {
    "PRESENT": 1,
    "HALF_DAY": 0.5,
    "ABSENT": 0
  };
  
  return multipliers[status] || 0;
};

export const normalizeUID = (uid) => {
  return uid.replace(/\s+/g, "").toUpperCase();
};

export const createUIDRegex = (uid) => {
  const cleanUID = normalizeUID(uid);
  const pattern = cleanUID.split("").join("\\s*");
  return new RegExp(pattern, "i");
};