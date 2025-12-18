import express from "express";
import { 
  scanCard, 
  getAttendance, 
  getMonthlyAttendance,
  getSalaryCalculation,
  markAbsentUsers 
} from "../controllers/attendanceController.js";

const router = express.Router();

// RFID Scanning (with offline device support)
router.post("/scan", scanCard);

// Attendance Viewing
router.get("/view", getAttendance);
router.get("/monthly/:userId", getMonthlyAttendance);

// Salary Calculation
router.get("/salary/:userId", getSalaryCalculation);

// Admin Functions
router.post("/mark-absent", markAbsentUsers);

export default router;