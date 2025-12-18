import express from "express";
import { registerUser, registerAdmin, adminLogin, getUsers } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/admin-login", adminLogin);
router.get("/", getUsers);

export default router;
