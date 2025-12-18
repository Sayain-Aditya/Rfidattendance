import express from "express";
import { 
  scanCard, 
  getAttendance, 
  getMonthlyAttendance, 
  markAbsentUsers 
} from "../controllers/attendanceController.js";

const router = express.Router();

// RFID Scanning
router.post("/scan", scanCard);

// Attendance Viewing
router.get("/view", getAttendance);
router.get("/monthly/:userId", getMonthlyAttendance);

// Admin Functions
router.post("/mark-absent", markAbsentUsers);

export default router;