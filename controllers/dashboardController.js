import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import Notice from "../models/Notice.js";
import { getISTDate } from "../utils/istTime.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const today = getISTDate();
    
    // Get all employees (handle if collection is empty)
    const totalEmployees = await User.countDocuments({ role: "Employee" }) || 0;
    
    // Get today's attendance (handle if collection is empty)
    const todayAttendance = await Attendance.find({ date: today })
      .populate("user", "name uid email") || [];
    
    // Calculate stats
    const presentEmployees = todayAttendance.filter(a => 
      a.status === 'PRESENT' || a.status === 'OUT'
    );
    const absentEmployees = todayAttendance.filter(a => a.status === 'ABSENT');
    
    // Basic response with minimal data
    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          presentEmployees: presentEmployees.length,
          absentEmployees: absentEmployees.length,
          employeesOnLeave: 0
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
          onLeave: []
        },
        pendingLeaves: [],
        complaintStats: {
          new: 0,
          inProcess: 0,
          resolved: 0
        },
        recentComplaints: [],
        notices: [],
        notifications: {
          newLeaves: 0,
          newComplaints: 0
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