import express from "express";
import { 
  createShift, 
  assignShift, 
  getUserShifts, 
  getAllShifts, 
  updateShift, 
  deleteShift 
} from "../controllers/shiftController.js";

const router = express.Router();

router.post("/create", createShift);
router.post("/assign", assignShift);
router.get("/user/:userId", getUserShifts);
router.get("/", getAllShifts);
router.put("/:shiftId", updateShift);
router.delete("/:shiftId", deleteShift);

export default router;