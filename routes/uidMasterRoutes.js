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
router.get("/view/available", getAvailableUIDs);
router.get("/view/all", getAllUIDs);
router.put("/update/:updateId", updateUID);
router.delete("/delete/:uidId", deleteUID);

export default router;