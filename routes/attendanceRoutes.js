import express from "express";
import { scanCard, getAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/scan", scanCard);
router.get("/view", getAttendance);

export default router;
