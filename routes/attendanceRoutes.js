import express from "express";
import { 
  scanCard, 
  getAttendance,
  getTodayAttendance,
  getMonthlyAttendance,
  getUserAttendance,
  getAttendanceWithFilters,
  getMonthlyAttendanceSummary
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/scan", scanCard);
router.get("/view/all", getAttendance);
router.get("/view/today", getTodayAttendance);
router.get("/view/monthly", getMonthlyAttendance);
router.get("/view/filters", getAttendanceWithFilters);
router.get("/view/summary", getMonthlyAttendanceSummary);
router.get("/user/:userId", getUserAttendance);

export default router;