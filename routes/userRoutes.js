import express from "express";
import { registerUser, registerAdmin, login, getUsers, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.get("/view/all", getUsers);
router.put("/update/:userId", updateUser);
router.delete("/delete/:userId", deleteUser);

export default router;
