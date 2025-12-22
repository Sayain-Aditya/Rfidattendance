import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Shift from "../models/Shift.js";
import { getAttendanceDate, getISTTime, calculateWorkMinutes, getFinalStatus, isLateEntry } from "../utils/istTime.js";
import { normalizeUID, createUIDRegex, lazyMarkAbsent, fillMissingAttendance } from "../utils/lazyAttendance.js";

export const scanCard = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    const uidRegex = createUIDRegex(uid);
    const user = await User.findOne({ uid: uidRegex }).populate('currentShift');

    if (!user) {
      return res.json({
        success: false,
        type: "INVALID",
        message: "Invalid Card - User not registered"
      });
    }

    const userShift = user.currentShift;

    const scanDate = getAttendanceDate();
    const scanTime = getISTTime();
    const now = new Date();

    let attendance = await Attendance.findOne({
      user: user._id,
      date: scanDate
    });

    if (attendance && attendance.lastScanAt) {
      const timeDiff = (now - attendance.lastScanAt) / 1000;
      if (timeDiff < 10) {
        return res.json({
          success: false,
          message: "Duplicate scan - Please wait 10 seconds"
        });
      }
    }

    if (!attendance) {
      attendance = await Attendance.create({
        user: user._id,
        date: scanDate,
        checkIn: scanTime,
        status: "IN",
        scanStatus: "IN",
        lastScanAt: now,
        workMinutes: 0
      });

      return res.json({
        success: true,
        type: "IN",
        name: user.name,
        time: scanTime,
        date: scanDate
      });
    }

    if (attendance.scanStatus === "IN") {
      const workMinutes = calculateWorkMinutes(attendance.checkIn, scanTime);
      const finalStatus = getFinalStatus(workMinutes, userShift);
      const late = isLateEntry(attendance.checkIn, userShift);
      
      attendance.checkOut = scanTime;
      attendance.scanStatus = "OUT";
      attendance.status = finalStatus;
      attendance.workMinutes = workMinutes;
      attendance.lastScanAt = now;
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        name: user.name,
        time: scanTime,
        date: scanDate,
        workMinutes,
        status: finalStatus,
        isLate: late,
        shift: userShift ? {
          name: userShift.shiftName,
          startTime: userShift.startTime,
          endTime: userShift.endTime
        } : null
      });
    }

    return res.json({
      success: false,
      message: "Attendance already completed for this date"
    });

  } catch (error) {
    console.error("❌ Scan Card Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
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

export const getMonthlyAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

    await fillMissingAttendance(userId, startDate, endDate);

    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalWorkMinutes = 0;

    records.forEach(record => {
      if (record.status === "PRESENT") presentDays++;
      else if (record.status === "HALF_DAY") halfDays++;
      else if (record.status === "ABSENT") absentDays++;
      
      totalWorkMinutes += record.workMinutes || 0;
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        uid: user.uid
      },
      period: `${month}/${year}`,
      summary: {
        presentDays,
        halfDays,
        absentDays,
        totalDays: records.length,
        totalWorkMinutes,
        totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100
      },
      records
    });

  } catch (error) {
    console.error("❌ Monthly Attendance Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly attendance"
    });
  }
};

export const getSalaryCalculation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year, baseSalary = 30000 } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    let payableDays = 0;
    const breakdown = {};

    for (const record of records) {
      let multiplier = 0;
      if (record.status === "PRESENT") multiplier = 1;
      else if (record.status === "HALF_DAY") multiplier = 0.5;
      
      payableDays += multiplier;
      breakdown[record.status] = (breakdown[record.status] || 0) + multiplier;
    }

    const dailyRate = parseFloat(baseSalary) / daysInMonth;
    const payableSalary = payableDays * dailyRate;

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        uid: user.uid
      },
      period: `${month}/${year}`,
      salary: {
        baseSalary: parseFloat(baseSalary),
        dailyRate: Math.round(dailyRate * 100) / 100,
        payableDays: Math.round(payableDays * 100) / 100,
        payableSalary: Math.round(payableSalary * 100) / 100
      },
      breakdown,
      totalDays: daysInMonth
    });

  } catch (error) {
    console.error("❌ Salary Calculation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate salary"
    });
  }
};

export const markAbsentUsers = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId) {
      await lazyMarkAbsent();
    } else {
      const users = await User.find({ role: "Employee" });
      for (const user of users) {
        await lazyMarkAbsent();
      }
    }
    
    res.json({
      success: true,
      message: "Lazy attendance resolved successfully"
    });
  } catch (error) {
    console.error("❌ Mark Absent Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve attendance"
    });
  }
};