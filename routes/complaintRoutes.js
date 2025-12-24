import express from "express";
import { submitComplaint, getComplaints, updateComplaintStatus } from "../controllers/complaintController.js";

const router = express.Router();

router.post("/submit", submitComplaint);
router.get("/", getComplaints);
router.put("/:complaintId", updateComplaintStatus);

export default router;