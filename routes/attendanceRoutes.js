import express from "express";
import { 
  scanCard, 
  getAttendance,
  getTodayAttendance,
  getMonthlyAttendance,
  getUserAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/scan", scanCard);
router.get("/", getAttendance);
router.get("/today", getTodayAttendance);
router.get("/monthly", getMonthlyAttendance);
router.get("/user/:userId", getUserAttendance);

export default router;