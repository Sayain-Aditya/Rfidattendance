import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import mongoose from "mongoose";
import { getISTDate, getISTTime, parseDeviceTime, formatTimeForDisplay } from "../utils/istTime.js";
import { normalizeUID, createUIDRegex } from "../utils/lazyAttendance.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const formatAttendanceRecord = (record) => ({
  ...record,
  checkIn: formatTimeForDisplay(record.checkIn),
  checkOut: formatTimeForDisplay(record.checkOut)
});

const getMonthRange = (month) => {
  const year = parseInt(month.split("-")[0], 10);
  const monthNum = parseInt(month.split("-")[1], 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${daysInMonth.toString().padStart(2, "0")}`
  };
};

// Convert "HH:MM" or "09:30 AM" to total minutes
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  // Handle 12-hour format (09:30 AM)
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, period] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  // Handle 24-hour format (09:30)
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const scanCard = async (req, res) => {
  try {
    const { uid, deviceTime } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: "UID is required" });
    }

    const cleanUID = normalizeUID(uid);
    let user = await User.findOne({ uid: cleanUID })
      .select("name uid currentShift")
      .populate("currentShift", "startTime graceMinutes minimumHours")
      .lean();

    if (!user) {
      const uidRegex = createUIDRegex(uid);
      user = await User.findOne({ uid: uidRegex })
        .select("name uid currentShift")
        .populate("currentShift", "startTime graceMinutes minimumHours")
        .lean();
    }

    if (!user) {
      return res.json({ success: false, reason: "INVALID_CARD", message: "Invalid Card - User not registered" });
    }

    const attendanceDate = getISTDate();
    const currentTime = deviceTime ? parseDeviceTime(deviceTime) : getISTTime();
    const now = new Date();

    // Check if employee is on approved leave today
    const onLeave = await Leave.exists({
      user: user._id,
      status: "APPROVED",
      startDate: { $lte: attendanceDate },
      endDate: { $gte: attendanceDate }
    });

    if (onLeave) {
      return res.json({ success: false, reason: "ON_LEAVE", message: `${user.name} is on approved leave today` });
    }

    let attendance = await Attendance.findOne({ user: user._id, date: attendanceDate })
      .select("checkIn checkOut lastScanAt scanStatus status workMinutes");

    if (attendance && attendance.lastScanAt) {
      const timeDiff = (now - attendance.lastScanAt) / 1000;
      if (timeDiff < 10) {
        return res.json({ success: false, reason: "DUPLICATE_SCAN", message: "Duplicate scan - Please wait 10 seconds" });
      }
    }

    const shift = user.currentShift;

    if (!attendance) {
      // --- CHECK IN ---
      let isLate = false;
      let checkInStatus = "IN";

      if (shift) {
        const shiftStartMinutes = toMinutes(shift.startTime);
        const graceMinutes = shift.graceMinutes || 15;
        const checkInMinutes = toMinutes(currentTime);
        if (checkInMinutes > shiftStartMinutes + graceMinutes) {
          isLate = true;
          checkInStatus = "LATE";
        }
      }

      attendance = await Attendance.create({
        user: user._id,
        date: attendanceDate,
        checkIn: currentTime,
        status: checkInStatus,
        scanStatus: "IN",
        isLate,
        lastScanAt: now
      });

      return res.json({
        success: true,
        type: "IN",
        name: user.name,
        time: currentTime,
        date: attendanceDate,
        isLate,
        message: isLate ? `${user.name} checked in LATE` : `${user.name} checked in`
      });
    }

    if (attendance.scanStatus === "IN") {
      // --- CHECK OUT ---
      const checkInMinutes = toMinutes(attendance.checkIn);
      const checkOutMinutes = toMinutes(currentTime);
      let workMinutes = checkOutMinutes - checkInMinutes;
      if (workMinutes < 0) workMinutes += 24 * 60; // overnight shift

      let finalStatus = "PRESENT";

      if (shift) {
        const minimumMinutes = (shift.minimumHours || 4) * 60;
        if (workMinutes < minimumMinutes) {
          finalStatus = "HALF_DAY";
        }
      }

      attendance.checkOut = currentTime;
      attendance.scanStatus = "OUT";
      attendance.status = finalStatus;
      attendance.workMinutes = workMinutes;
      attendance.lastScanAt = now;
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        name: user.name,
        time: currentTime,
        date: attendanceDate,
        workMinutes,
        status: finalStatus,
        message: finalStatus === "HALF_DAY"
          ? `${user.name} checked out - HALF DAY (${Math.floor(workMinutes / 60)}h ${workMinutes % 60}m)`
          : `${user.name} checked out (${Math.floor(workMinutes / 60)}h ${workMinutes % 60}m)`
      });
    }

    return res.json({ success: false, reason: "ALREADY_OUT", message: "Attendance already completed for today" });

  } catch (error) {
    console.error("❌ Scan Card Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const today = getISTDate();
    
    const attendance = await Attendance.find({ date: today })
      .select("user date checkIn checkOut scanStatus status workMinutes isLate createdAt")
      .populate("user", "name uid role")
      .sort({ createdAt: -1 })
      .lean();

    const formattedAttendance = attendance.map(formatAttendanceRecord);

    res.json({
      success: true,
      date: today,
      count: formattedAttendance.length,
      data: formattedAttendance
    });
  } catch (error) {
    console.error("❌ Today Attendance Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance"
    });
  }
};

export const getMonthlyAttendance = async (req, res) => {
  try {
    const month = req.query.month || getISTDate().slice(0, 7);
    const { page, limit, skip } = getPagination(req.query);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Month format should be YYYY-MM" });
    }

    const { startDate, endDate } = getMonthRange(month);
    const query = { date: { $gte: startDate, $lte: endDate } };

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .select("user date checkIn checkOut scanStatus status workMinutes isLate createdAt")
        .populate("user", "name uid employeeId role")
        .sort({ date: 1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      month,
      count: attendance.length,
      data: attendance,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: attendance.length
      }
    });
  } catch (error) {
    console.error("❌ Monthly Attendance Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch monthly attendance" });
  }
};

export const getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Month format should be YYYY-MM" });
    }

    const user = await User.findById(userId).select("name uid employeeId").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filter = { user: userId };
    if (month) {
      const { startDate, endDate } = getMonthRange(month);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .select("date checkIn checkOut scanStatus status workMinutes isLate createdAt")
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Attendance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      user: { id: user._id, name: user.name, uid: user.uid, employeeId: user.employeeId },
      data: attendance,
      pagination: { current: page, total: Math.ceil(total / limit), count: attendance.length }
    });
  } catch (error) {
    console.error("❌ User Attendance Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user attendance" });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { userId } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    if (userId && !isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    
    const query = userId ? { user: userId } : {};
    
    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .select("user date checkIn checkOut scanStatus status workMinutes isLate createdAt")
        .populate("user", "name uid role")
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: attendance.length
      }
    });
  } catch (error) {
    console.error("❌ Get Attendance Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance records"
    });
  }
};

// Get attendance with filters
export const getAttendanceWithFilters = async (req, res) => {
  try {
    const { date, employeeId, startDate, endDate } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    let filter = {};

    if (employeeId && !isValidObjectId(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }

    if (date) {
      filter.date = date;
    }

    if (startDate && endDate) {
      filter.date = { 
        $gte: startDate, 
        $lte: endDate 
      };
    }

    if (employeeId) {
      filter.user = employeeId;
    }

    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .select("user date checkIn checkOut scanStatus status workMinutes isLate createdAt")
        .populate("user", "name email uid role")
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Attendance.countDocuments(filter)
    ]);

    const formattedAttendance = attendance.map(formatAttendanceRecord);

    res.json({
      success: true,
      data: formattedAttendance,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: formattedAttendance.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly summary
export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { month, employeeId } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Month format should be YYYY-MM" });
    }

    if (employeeId && !isValidObjectId(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }

    const { startDate, endDate } = getMonthRange(month);

    const todayIST = getISTDate();
    const effectiveEndDate = endDate > todayIST ? todayIST : endDate;
    const totalWorkingDays = Math.max(0,
      Math.floor((new Date(effectiveEndDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
    );

    const [attendance, employees] = await Promise.all([
      Attendance.find({ date: { $gte: startDate, $lte: effectiveEndDate }, ...(employeeId && { user: employeeId }) })
        .select("user status isLate")
        .populate("user", "name uid employeeId")
        .lean(),
      employeeId ? [] : User.find({ role: "Employee" }, "name uid employeeId").lean()
    ]);

    const summary = {};

    if (!employeeId) {
      employees.forEach(emp => {
        summary[emp._id.toString()] = {
          user: { _id: emp._id, name: emp.name, uid: emp.uid, employeeId: emp.employeeId },
          totalWorkingDays,
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          lateDays: 0,
          recordedDays: 0
        };
      });
    }

    attendance.forEach(record => {
      const userId = record.user._id.toString();
      if (!summary[userId]) {
        summary[userId] = {
          user: { _id: record.user._id, name: record.user.name, uid: record.user.uid, employeeId: record.user.employeeId },
          totalWorkingDays,
          presentDays: 0,
          absentDays: 0,
          halfDays: 0,
          lateDays: 0,
          recordedDays: 0
        };
      }
      summary[userId].recordedDays++;
      const s = record.status;
      if (s === "PRESENT" || s === "LATE" || s === "IN") summary[userId].presentDays++;
      else if (s === "HALF_DAY") { summary[userId].presentDays++; summary[userId].halfDays++; }
      else if (s === "ABSENT") summary[userId].absentDays++;
      if (record.isLate) summary[userId].lateDays++;
    });

    Object.values(summary).forEach(s => {
      s.absentDays += totalWorkingDays - s.recordedDays;
      delete s.recordedDays;
    });

    res.json({ success: true, month, totalWorkingDays, data: Object.values(summary) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
