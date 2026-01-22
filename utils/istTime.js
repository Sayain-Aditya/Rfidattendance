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
  const now = new Date();
  // Add 5.5 hours to UTC to get IST
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  return istTime.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

export const parseDeviceTime = (deviceTime) => {
  try {
    // Device time is already in IST format (YYYY-MM-DD HH:MM:SS)
    // Just extract the time part and format it
    if (typeof deviceTime === 'string' && deviceTime.includes(' ')) {
      const timePart = deviceTime.split(' ')[1]; // Get HH:MM:SS
      const [hours, minutes] = timePart.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      
      return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    }
    
    // Fallback to current IST time
    return getISTTime();
  } catch (error) {
    return getISTTime();
  }
};

export const getAttendanceDate = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  
  if (istTime.getHours() >= 0 && istTime.getHours() < 3) {
    istTime.setDate(istTime.getDate() - 1);
  }
  
  return istTime.toISOString().split('T')[0];
};

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
  
  if (outMinutes < inMinutes) {
    return (24 * 60) - inMinutes + outMinutes;
  }
  
  return outMinutes - inMinutes;
};

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

// Format time for consistent display
export const formatTimeForDisplay = (timeString) => {
  if (!timeString) return null;
  
  // If it's already in the correct format, return as is
  if (typeof timeString === 'string' && timeString.includes('M')) {
    return timeString;
  }
  
  // If it's a Date object or timestamp, convert to IST
  try {
    const date = new Date(timeString);
    // Add 5.5 hours to UTC to get IST
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    return istTime.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (error) {
    return timeString;
  }
};