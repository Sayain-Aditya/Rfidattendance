import express from "express";
import { submitLeave, getLeaves, updateLeaveStatus } from "../controllers/leaveController.js";

const router = express.Router();

router.post("/submit", submitLeave);
router.get("/", getLeaves);
router.put("/:leaveId", updateLeaveStatus);

export default router;