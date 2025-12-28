import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import shiftRoutes from "./routes/shiftRoutes.js";
import uidMasterRoutes from "./routes/uidMasterRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: ['https://rfidfrontend.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.use("/api/user", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/shift", shiftRoutes);
app.use("/api/uid-master", uidMasterRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/complaint", complaintRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notice", noticeRoutes);

app.get("/", (req, res) => {
  res.send("RFID Attendance Backend Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export default app;