import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { 
  resolveLazyAttendance,
  getISTTime,
  getAttendanceStatus,
  normalizeUID,
  createUIDRegex,
  getSalaryMultiplier
} from "../utils/lazyAttendance.js";

const getISTDate = () => {
  return new Date().toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

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
        type: "INVALID",
        message: "Invalid Card - User not registered"
      });
    }

    let scanDate, scanTime;
    
    if (deviceTime) {
      const deviceDateTime = new Date(deviceTime);
      scanDate = deviceDateTime.toISOString().split('T')[0];
      scanTime = deviceDateTime.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } else {
      scanDate = getISTDate();
      scanTime = getISTTime();
    }

    await resolveLazyAttendance(user._id, scanDate);

    let attendance = await Attendance.findOne({
      user: user._id,
      date: scanDate
    });

    if (!attendance) {
      const attendanceType = getAttendanceStatus(scanTime);
      
      attendance = await Attendance.create({
        user: user._id,
        date: scanDate,
        checkIn: scanTime,
        status: attendanceType,
        scanStatus: "IN"
      });

      return res.json({
        success: true,
        type: "IN",
        attendanceType,
        name: user.name,
        time: scanTime,
        date: scanDate,
        message: `Check-In Successful - ${attendanceType}`
      });
    }

    if (attendance.scanStatus === "IN") {
      attendance.checkOut = scanTime;
      attendance.scanStatus = "OUT";
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        attendanceType: attendance.status,
        name: user.name,
        time: scanTime,
        date: scanDate,
        message: "Check-Out Successful"
      });
    }

    return res.json({
      success: false,
      type: "BLOCKED",
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
    
    if (userId) {
      await resolveLazyAttendance(userId);
    }
    
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

    await resolveLazyAttendance(userId);

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const allDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const existing = records.find(r => r.date === dateStr);
      
      if (existing) {
        allDates.push(existing);
      } else {
        const absentRecord = await Attendance.create({
          user: userId,
          date: dateStr,
          status: "ABSENT",
          scanStatus: "NONE"
        });
        allDates.push(absentRecord);
      }
    }

    const summary = {
      PRESENT: allDates.filter(r => r.status === "PRESENT").length,
      HALF_DAY: allDates.filter(r => r.status === "HALF_DAY").length,
      ABSENT: allDates.filter(r => r.status === "ABSENT").length,
      totalDays: allDates.length
    };

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        uid: user.uid
      },
      period: `${month}/${year}`,
      summary,
      records: allDates
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

    await resolveLazyAttendance(userId);

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
      const multiplier = getSalaryMultiplier(record.status);
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
      await resolveLazyAttendance(userId);
    } else {
      const users = await User.find({ role: "Employee" });
      for (const user of users) {
        await resolveLazyAttendance(user._id);
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