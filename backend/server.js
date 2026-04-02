import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import medicalRecordRoutes from "./routes/medicalRecordRoutes.js";
import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import specializationRoutes from "./routes/specializationRoutes.js";
import councilRoutes from "./routes/councilRoutes.js";
import practiceRoutes from "./routes/practiceRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import { detectTenant } from "./middleware/tenant.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io accessible to our routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("join-tenant", (tenantId) => {
    if (tenantId) {
      const roomName = tenantId.toString();
      socket.join(roomName);
      console.log(`Socket [${socket.id}] joined clinic room: [${roomName}]`);
    }
  });

  socket.on("join-pharmacy", (pharmacyId) => {
    if (pharmacyId) {
      const roomName = `pharmacy_${pharmacyId}`;
      socket.join(roomName);
      console.log(`Socket [${socket.id}] joined pharmacy room: [${roomName}]`);
    }
  });


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* --------------------------------------------------
Cloudinary Configuration
-------------------------------------------------- */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* --------------------------------------------------
Connect Database
-------------------------------------------------- */

connectDB();



/* --------------------------------------------------
Global Middleware
-------------------------------------------------- */

app.use(cors());
app.use(express.json());
app.set("io", io);


/* --------------------------------------------------
Multi-Tenant Middleware
-------------------------------------------------- */

app.use(detectTenant);

/* --------------------------------------------------
Server Test Routes
-------------------------------------------------- */

app.get("/test", (req, res) => {
  res.json({
    message: "Server is working 🚀",
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req, res) => {
  res.send("Hospital API is running 🚑");
});

/* --------------------------------------------------
Multer + Cloudinary Storage
-------------------------------------------------- */

const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hospital-profiles",
    allowed_formats: ["jpg", "png", "jpeg", "gif", "webp", "pdf"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },

});

// Local Disk Storage for development/fallback
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Use diskStorage in development/fallback to avoid Cloudinary timeouts
const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
const isDev = nodeEnv === "development" || nodeEnv === "dev";
const upload = multer({
  storage: isDev ? diskStorage : cloudStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only image files or PDFs are allowed!"), false);
    }
  },

});

global.upload = upload;

/* --------------------------------------------------
Static Files
-------------------------------------------------- */

app.use("/uploads", express.static("uploads"));

/* --------------------------------------------------
API Routes
-------------------------------------------------- */

app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/receptionists", receptionistRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/billing", billingRoutes);

app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoice-templates", templateRoutes);
app.use("/api/specializations", specializationRoutes);
app.use("/api/councils", councilRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/whatsapp", whatsappRoutes);

/* --------------------------------------------------
Image Upload API
-------------------------------------------------- */

app.post("/api/upload", (req, res) => {
  console.log("Upload request received");
  console.log("Headers:", req.headers['content-type']);
  
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({
        message: "Upload failed",
        error: err.message,
      });
    }

    if (!req.file) {
      console.warn("No file in request. Body:", req.body);
      return res.status(400).json({ message: "No file uploaded. Please ensure you are sending an image or PDF file." });
    }

    console.log("File uploaded successfully:", req.file.filename || req.file.path);
    
    res.json({
      message: "Image uploaded successfully",
      imageUrl: isDev 
        ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        : req.file.path,
    });
  });
});


/* --------------------------------------------------
Global Error Handler
-------------------------------------------------- */

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

/* --------------------------------------------------
Serve Frontend (Production)
-------------------------------------------------- */

if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  app.use(express.static(__dirname));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
}

/* --------------------------------------------------
Cron Loader
-------------------------------------------------- */

async function initCron() {
  if (process.env.ENABLE_CRON === "true") {
    try {
      const { setupSubscriptionCron } = await import(
        "./cron/subscriptionCron.js"
      );
      const { setupTrialResetCron } = await import(
        "./cron/trialResetCron.js"
      );
      setupSubscriptionCron();
      setupTrialResetCron();
      console.log("Subscription and Trial Reset crons started");
    } catch {
      console.log("Cron not enabled");
    }
  }
}

initCron();

/* --------------------------------------------------
Start Server
-------------------------------------------------- */

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});