import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import { getISTDate, getISTTime, parseDeviceTime, formatTimeForDisplay } from "../utils/istTime.js";
import { normalizeUID, createUIDRegex } from "../utils/lazyAttendance.js";

export const scanCard = async (req, res) => {
  try {
    const { uid, deviceTime } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    const uidRegex = createUIDRegex(uid);
    const user = await User.findOne({ uid: uidRegex });

    if (!user) {
      return res.json({
        success: false,
        reason: "INVALID_CARD",
        message: "Invalid Card - User not registered"
      });
    }

    const attendanceDate = getISTDate();
    const currentTime = deviceTime ? parseDeviceTime(deviceTime) : getISTTime();
    const now = new Date();

    let attendance = await Attendance.findOne({
      user: user._id,
      date: attendanceDate
    });

    if (attendance && attendance.lastScanAt) {
      const timeDiff = (now - attendance.lastScanAt) / 1000;
      if (timeDiff < 10) {
        return res.json({
          success: false,
          reason: "DUPLICATE_SCAN",
          message: "Duplicate scan - Please wait 10 seconds"
        });
      }
    }

    if (!attendance) {
      attendance = await Attendance.create({
        user: user._id,
        date: attendanceDate,
        checkIn: currentTime,
        status: "IN",
        scanStatus: "IN",
        lastScanAt: now
      });

      return res.json({
        success: true,
        type: "IN",
        name: user.name,
        time: currentTime,
        date: attendanceDate
      });
    }

    if (attendance.scanStatus === "IN") {
      attendance.checkOut = currentTime;
      attendance.scanStatus = "OUT";
      attendance.status = "PRESENT";
      attendance.lastScanAt = now;
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        name: user.name,
        time: currentTime,
        date: attendanceDate
      });
    }

    return res.json({
      success: false,
      reason: "ALREADY_OUT",
      message: "Attendance already completed for today"
    });

  } catch (error) {
    console.error("❌ Scan Card Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const today = getISTDate();
    
    const attendance = await Attendance.find({ date: today })
      .populate("user", "name uid role")
      .sort({ createdAt: -1 });

    // Format times for display
    const formattedAttendance = attendance.map(record => ({
      ...record.toObject(),
      checkIn: formatTimeForDisplay(record.checkIn),
      checkOut: formatTimeForDisplay(record.checkOut)
    }));

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
    const { month } = req.query;
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month format should be YYYY-MM"
      });
    }

    const startDate = `${month}-01`;
    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${daysInMonth.toString().padStart(2, '0')}`;

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .populate("user", "name uid")
    .sort({ date: 1, createdAt: 1 });

    const summary = {};
    attendance.forEach(record => {
      const userId = record.user._id.toString();
      if (!summary[userId]) {
        summary[userId] = {
          user: record.user,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          records: []
        };
      }
      summary[userId].totalDays++;
      if (record.status === "PRESENT" || record.status === "OUT") {
        summary[userId].presentDays++;
      } else {
        summary[userId].absentDays++;
      }
      summary[userId].records.push(record);
    });

    res.json({
      success: true,
      month,
      summary: Object.values(summary)
    });
  } catch (error) {
    console.error("❌ Monthly Attendance Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly attendance"
    });
  }
};

export const getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const attendance = await Attendance.find({ user: userId })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments({ user: userId });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        uid: user.uid
      },
      data: attendance,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: attendance.length
      }
    });
  } catch (error) {
    console.error("❌ User Attendance Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user attendance"
    });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    
    const query = userId ? { user: userId } : {};
    
    const attendance = await Attendance.find(query)
      .populate("user", "name uid role")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
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
    let filter = {};

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

    const attendance = await Attendance.find(filter)
      .populate('user', 'name email')
      .sort({ date: -1 });

    // Format times for display
    const formattedAttendance = attendance.map(record => ({
      ...record.toObject(),
      checkIn: formatTimeForDisplay(record.checkIn),
      checkOut: formatTimeForDisplay(record.checkOut)
    }));

    res.json({ success: true, data: formattedAttendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly summary
export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    
    let filter = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (employeeId) {
      filter.user = employeeId;
    }

    const attendance = await Attendance.find(filter)
      .populate('user', 'name email');

    const summary = {};
    const totalDays = daysInMonth;

    // Group by employee
    attendance.forEach(record => {
      const userId = record.user._id.toString();
      if (!summary[userId]) {
        summary[userId] = {
          employee: record.user,
          totalWorkingDays: totalDays,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0
        };
      }
      
      if (record.status === 'PRESENT' || record.status === 'OUT') {
        summary[userId].presentDays++;
      } else if (record.status === 'ABSENT') {
        summary[userId].absentDays++;
      }
    });

    res.json({ success: true, data: Object.values(summary) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};