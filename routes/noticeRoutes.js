import express from "express";
import { createNotice, getNotices, updateNotice, deleteNotice } from "../controllers/noticeController.js";

const router = express.Router();

router.post("/create", createNotice);
router.get("/", getNotices);
router.put("/:noticeId", updateNotice);
router.delete("/:noticeId", deleteNotice);

export default router;