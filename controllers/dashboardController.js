import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import { getISTDate } from "../utils/istTime.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const today = getISTDate();
    
    // Get all employees
    const totalEmployees = await User.countDocuments({ role: "Employee" });
    
    // Get today's attendance
    const todayAttendance = await Attendance.find({ date: today })
      .populate("user", "name uid email");
    
    // Get employees on leave today
    const employeesOnLeave = await Leave.find({
      status: "APPROVED",
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate("user", "name uid email");
    
    // Calculate stats
    const presentEmployees = todayAttendance.filter(a => 
      a.status === 'PRESENT' || a.status === 'OUT'
    );
    const absentEmployees = todayAttendance.filter(a => a.status === 'ABSENT');
    
    // Get pending leave applications
    const pendingLeaves = await Leave.find({ status: "PENDING" })
      .populate("user", "name uid email")
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get complaint statistics
    const complaintStats = {
      new: await Complaint.countDocuments({ status: "OPEN" }),
      inProcess: await Complaint.countDocuments({ status: "IN_PROGRESS" }),
      resolved: await Complaint.countDocuments({ status: "RESOLVED" })
    };
    
    // Get recent complaints
    const recentComplaints = await Complaint.find({ status: "OPEN" })
      .populate("user", "name uid email")
      .sort({ createdAt: -1 })
      .limit(3);

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
            name: a.user.name,
            uid: a.user.uid,
            checkIn: a.checkIn,
            status: a.status
          })),
          absent: absentEmployees.map(a => ({
            name: a.user.name,
            uid: a.user.uid
          })),
          onLeave: employeesOnLeave.map(l => ({
            name: l.user.name,
            uid: l.user.uid,
            reason: l.reason,
            startDate: l.startDate,
            endDate: l.endDate
          }))
        },
        pendingLeaves,
        complaintStats,
        recentComplaints,
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
      message: "Failed to fetch dashboard data"
    });
  }
};