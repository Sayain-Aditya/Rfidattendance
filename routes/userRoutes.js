import express from "express";
import { registerUser, registerAdmin, adminLogin } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/admin-login", adminLogin);

export default router;
