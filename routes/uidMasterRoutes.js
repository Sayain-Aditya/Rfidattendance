import express from "express";
import { 
  addUID, 
  getAvailableUIDs, 
  getAllUIDs, 
  updateUID,
  deleteUID 
} from "../controllers/uidMasterController.js";

const router = express.Router();

router.post("/add", addUID);
router.get("/available", getAvailableUIDs);
router.get("/list", getAllUIDs);
router.put("/:updateId", updateUID);
router.delete("/:uidId", deleteUID);

export default router;