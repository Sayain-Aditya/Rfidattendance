import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { 
  getISTDate, 
  getISTTime, 
  normalizeUID, 
  createUIDRegex, 
  getAttendanceStatus 
} from "../utils/attendanceUtils.js";
import { checkAndMarkAbsent } from "../utils/lazyAbsentMarking.js";

/**
 * ENTERPRISE RFID SCAN CARD API
 * Handles check-in/check-out with business rules
 * Supports flexible UID matching and IST timezone
 */
export const scanCard = async (req, res) => {
  try {
    // Lazy absent marking for Vercel (runs once per day)
    await checkAndMarkAbsent();
    
    const { uid } = req.body;

    // Validate UID input
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "UID is required"
      });
    }

    // Find user with flexible UID matching (with or without spaces)
    const uidRegex = createUIDRegex(uid);
    const user = await User.findOne({ uid: uidRegex });

    if (!user) {
      return res.json({
        success: false,
        type: "INVALID",
        message: "Invalid Card - User not registered"
      });
    }

    // Get current IST date and time
    const currentDate = getISTDate();
    const currentTime = getISTTime();

    // Find or create today's attendance record
    let attendance = await Attendance.findOne({
      user: user._id,
      date: currentDate
    });

    // FIRST SCAN - CHECK IN
    if (!attendance) {
      // Determine attendance status based on check-in time
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

    // BLOCK MULTIPLE SCANS AFTER OUT
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
 * GET ALL ATTENDANCE RECORDS
 * Returns paginated attendance records with user details
 */
export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const attendance = await Attendance.find()
      .populate("user", "name uid role")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments();

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

/**
 * MONTHLY ATTENDANCE API
 * Returns summary and detailed records for a specific user and month
 */
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    // Validate required parameters
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Create date range for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    // Fetch attendance records for the month
    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Calculate summary statistics
    const summary = {
      PRESENT: records.filter(r => r.status === "PRESENT").length,
      HALF_DAY: records.filter(r => r.status === "HALF_DAY").length,
      LATE: records.filter(r => r.status === "LATE").length,
      ABSENT: records.filter(r => r.status === "ABSENT").length,
      totalDays: records.length
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

/**
 * MANUAL TRIGGER FOR MARKING ABSENT USERS
 * Admin endpoint to manually trigger absent marking process
 */
export const markAbsentUsers = async (req, res) => {
  try {
    const { checkAndMarkAbsent } = await import("../utils/lazyAbsentMarking.js");
    await checkAndMarkAbsent();
    
    res.json({
      success: true,
      message: "Absent users marked successfully"
    });
  } catch (error) {
    console.error("❌ Mark Absent Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark absent users"
    });
  }
};