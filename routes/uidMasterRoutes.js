import express from "express";
import { 
  addUID, 
  getAvailableUIDs, 
  getAllUIDs, 
  deleteUID 
} from "../controllers/uidMasterController.js";

const router = express.Router();

router.post("/add", addUID);
router.get("/available", getAvailableUIDs);
router.get("/", getAllUIDs);
router.delete("/:uidId", deleteUID);

export default router;