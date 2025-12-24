import express from "express";
import { registerUser, registerAdmin, login, getUsers, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.get("/", getUsers);
router.put("/:userId", updateUser);
router.delete("/:userId", deleteUser);

export default router;
