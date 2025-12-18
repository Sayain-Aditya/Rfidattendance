import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { 
  resolveLazyAttendance,
  getISTTime,
  getAttendanceStatus,
  normalizeUID,
  createUIDRegex
} from "../utils/lazyAttendance.js";

/**
 * Get current IST date
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
 * RFID SCAN CARD API WITH LAZY ATTENDANCE
 */
export const scanCard = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    // Find user with flexible UID matching
    const uidRegex = createUIDRegex(uid);
    const user = await User.findOne({ uid: uidRegex });

    if (!user) {
      return res.json({
        success: false,
        type: "INVALID",
        message: "Invalid Card - User not registered"
      });
    }

    // RESOLVE LAZY ATTENDANCE FIRST
    await resolveLazyAttendance(user._id);

    // Get current IST date and time
    const currentDate = getISTDate();
    const currentTime = getISTTime();

    // Find today's attendance record
    let attendance = await Attendance.findOne({
      user: user._id,
      date: currentDate
    });

    // FIRST SCAN - CHECK IN
    if (!attendance) {
      const attendanceType = getAttendanceStatus(currentTime);
      
      attendance = await Attendance.create({
        user: user._id,
        date: currentDate,
        checkIn: currentTime,
        status: attendanceType,
        scanStatus: "IN"
      });

      return res.json({
        success: true,
        type: "IN",
        attendanceType,
        name: user.name,
        time: currentTime,
        message: `Check-In Successful - ${attendanceType}`
      });
    }

    // SECOND SCAN - CHECK OUT
    if (attendance.scanStatus === "IN") {
      attendance.checkOut = currentTime;
      attendance.scanStatus = "OUT";
      await attendance.save();

      return res.json({
        success: true,
        type: "OUT",
        attendanceType: attendance.status,
        name: user.name,
        time: currentTime,
        message: "Check-Out Successful"
      });
    }

    // BLOCK FURTHER SCANS
    return res.json({
      success: false,
      type: "BLOCKED",
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

/**
 * GET ALL ATTENDANCE WITH LAZY RESOLUTION
 */
export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    
    // If userId provided, resolve lazy attendance for that user
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

/**
 * MONTHLY ATTENDANCE WITH LAZY RESOLUTION
 */
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

    // RESOLVE LAZY ATTENDANCE FIRST
    await resolveLazyAttendance(userId);

    // Create date range for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;

    // Fetch attendance records
    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Auto-fill missing days as ABSENT
    const allDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const existing = records.find(r => r.date === dateStr);
      
      if (existing) {
        allDates.push(existing);
      } else {
        // Create absent record for missing day
        const absentRecord = await Attendance.create({
          user: userId,
          date: dateStr,
          status: "ABSENT",
          scanStatus: "NONE"
        });
        allDates.push(absentRecord);
      }
    }

    // Calculate summary
    const summary = {
      PRESENT: allDates.filter(r => r.status === "PRESENT").length,
      HALF_DAY: allDates.filter(r => r.status === "HALF_DAY").length,
      LATE: allDates.filter(r => r.status === "LATE").length,
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

/**
 * MANUAL ABSENT MARKING (ADMIN)
 */
export const markAbsentUsers = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId) {
      // Mark specific user
      await resolveLazyAttendance(userId);
    } else {
      // Mark all users
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