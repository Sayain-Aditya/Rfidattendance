// IST Time Utility - Single Source of Truth
export const getISTDateTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });
};

export const getISTDate = () => {
  const istDateTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });
  return new Date(istDateTime).toISOString().split('T')[0];
};

export const getISTTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

// Handle midnight edge case: 12:00 AM - 3:00 AM counts as previous day
export const getAttendanceDate = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  
  // If between 12:00 AM - 3:00 AM, use previous day
  if (istTime.getHours() >= 0 && istTime.getHours() < 3) {
    istTime.setDate(istTime.getDate() - 1);
  }
  
  return istTime.toISOString().split('T')[0];
};

// Calculate work minutes between two time strings
export const calculateWorkMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  const parseTime = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };
  
  const inMinutes = parseTime(checkIn);
  const outMinutes = parseTime(checkOut);
  
  // Handle next day checkout
  if (outMinutes < inMinutes) {
    return (24 * 60) - inMinutes + outMinutes;
  }
  
  return outMinutes - inMinutes;
};

// Determine final status based on work minutes
export const getFinalStatus = (workMinutes, userShift = null) => {
  if (workMinutes === 0) return "ABSENT";
  
  const minimumHours = userShift ? userShift.minimumHours : 4;
  const minimumMinutes = minimumHours * 60;
  
  if (workMinutes < minimumMinutes) return "HALF_DAY";
  return "PRESENT";
};

export const isLateEntry = (checkInTime, userShift = null) => {
  if (!userShift) return false;
  
  const parseTime = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };
  
  const checkInMinutes = parseTime(checkInTime);
  const shiftStartMinutes = parseTime(userShift.startTime);
  const graceMinutes = userShift.graceMinutes || 15;
  
  return checkInMinutes > (shiftStartMinutes + graceMinutes);
};