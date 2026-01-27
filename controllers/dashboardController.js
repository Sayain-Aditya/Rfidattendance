import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import Notice from "../models/Notice.js";
import { getISTDate } from "../utils/istTime.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const today = getISTDate();
    
    // Get all employees
    const totalEmployees = await User.countDocuments({ role: "Employee" }) || 0;
    
    // Get today's attendance
    const todayAttendance = await Attendance.find({ date: today })
      .populate("user", "name uid email") || [];
    
    // Get employees on leave today
    let employeesOnLeave = [];
    try {
      employeesOnLeave = await Leave.find({
        status: "APPROVED",
        startDate: { $lte: today },
        endDate: { $gte: today }
      }).populate("user", "name uid email");
    } catch (err) {
      console.log("Leave collection not found or empty");
    }
    
    // Calculate stats
    const presentEmployees = todayAttendance.filter(a => 
      a.status === 'PRESENT' || a.status === 'OUT'
    );
    const absentEmployees = todayAttendance.filter(a => a.status === 'ABSENT');
    
    // Get pending leave applications
    let pendingLeaves = [];
    try {
      pendingLeaves = await Leave.find({ status: "PENDING" })
        .populate("user", "name uid email")
        .sort({ createdAt: -1 })
        .limit(5);
    } catch (err) {
      console.log("Leave collection not found");
    }
    
    // Get complaint statistics
    let complaintStats = { new: 0, inProcess: 0, resolved: 0 };
    let recentComplaints = [];
    try {
      complaintStats = {
        new: await Complaint.countDocuments({ status: "OPEN" }) || 0,
        inProcess: await Complaint.countDocuments({ status: "IN_PROGRESS" }) || 0,
        resolved: await Complaint.countDocuments({ status: "RESOLVED" }) || 0
      };
      
      recentComplaints = await Complaint.find({ status: "OPEN" })
        .populate("user", "name uid email")
        .sort({ createdAt: -1 })
        .limit(3);
    } catch (err) {
      console.log("Complaint collection not found");
    }
    
    // Get all active notices
    let notices = [];
    try {
      notices = await Notice.find({ isActive: true })
        .populate("createdBy", "name")
        .sort({ priority: -1, createdAt: -1 });
    } catch (err) {
      console.log("Notice collection not found");
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          presentEmployees: presentEmployees.length,
          absentEmployees: absentEmployees.length,
          employeesOnLeave: employeesOnLeave.length
        },
        liveStatus: {
          present: presentEmployees.map(a => ({
            name: a.user?.name || 'Unknown',
            uid: a.user?.uid || 'Unknown',
            checkIn: a.checkIn,
            status: a.status
          })),
          absent: absentEmployees.map(a => ({
            name: a.user?.name || 'Unknown',
            uid: a.user?.uid || 'Unknown'
          })),
          onLeave: employeesOnLeave.map(l => ({
            name: l.user?.name || 'Unknown',
            uid: l.user?.uid || 'Unknown',
            reason: l.reason,
            startDate: l.startDate,
            endDate: l.endDate
          }))
        },
        pendingLeaves,
        complaintStats,
        recentComplaints,
        notices,
        notifications: {
          newLeaves: pendingLeaves.length,
          newComplaints: recentComplaints.length
        }
      }
    });
  } catch (error) {
    console.error("❌ Admin Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message
    });
  }
};