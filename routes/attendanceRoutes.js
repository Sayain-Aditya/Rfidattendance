import express from "express";
import { 
  scanCard, 
  getAttendance, 
  getMonthlyAttendance,
  getSalaryCalculation,
  markAbsentUsers 
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/scan", scanCard);
router.get("/view", getAttendance);
router.get("/monthly/:userId", getMonthlyAttendance);
router.get("/salary/:userId", getSalaryCalculation);
router.post("/mark-absent", markAbsentUsers);

export default router;