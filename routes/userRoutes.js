import express from "express";
import { registerUser, registerAdmin, login, getUsers, updateUser, deleteUser, getNextEmployeeIdAPI, toggleUserStatus } from "../controllers/userController.js";
import { uploadProfile } from "../middleware/upload.js";

const router = express.Router();

router.post("/register", uploadProfile.single('profileImage'), registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.get("/view/all", getUsers);
router.get("/next-employee-id", getNextEmployeeIdAPI);
router.put("/update/:userId", uploadProfile.single('profileImage'), updateUser);
router.put("/toggle-status/:userId", toggleUserStatus);
router.delete("/delete/:userId", deleteUser);

export default router;