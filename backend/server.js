import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { uploadToS3 } from "./utils/uploadToS3.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import webhookRoutes from "./routes/webhook.js";
import contactRoutes from "./routes/contactRoutes.js";
import whatsappCreditRoutes from "./routes/whatsappCredits.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import diagnosisRoutes from "./routes/diagnosisRoutes.js";
import investigationRoutes from "./routes/investigationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import prescriptionTemplateRoutes from "./routes/prescriptionTemplateRoutes.js";
import devRoutes from "./routes/devRoutes.js";
import patientProgressImageRoutes from "./routes/patientProgressImageRoutes.js";
import patientProgressComparisonRoutes from "./routes/patientProgressComparisonRoutes.js";
import translationRoutes from "./routes/translationRoutes.js";
import clinicalNoteRoutes from "./routes/clinicalNoteRoutes.js";
import progressNoteRoutes from "./routes/progressNoteRoutes.js";
import { seedGlobalComplaints } from "./controllers/complaintController.js";
import { seedDiagnosisMaster } from "./controllers/diagnosisController.js";
import { seedMedicineMaster } from "./controllers/medicineController.js";
import { seedInvestigationMaster } from "./controllers/investigationController.js";
import internalPharmacyRoutes from "./routes/internalPharmacyRoutes.js";
import followUpReminderRoutes from "./routes/followUpReminderRoutes.js";
import { detectTenant } from "./middleware/tenant.js";

// Load environment variables based on NODE_ENV
const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.production' });
  console.log('Loading production environment variables');
} else {
  dotenv.config();
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"], // Allow both but prefer websocket
  allowEIO3: true // Backward compatibility if needed
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
S3 Configuration is handled in services/s3Service.js
-------------------------------------------------- */

/* --------------------------------------------------
Connect Database
-------------------------------------------------- */

connectDB().then(() => {
  seedGlobalComplaints();
});



/* --------------------------------------------------
Global Middleware
-------------------------------------------------- */

// Configure CORS more securely for production
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
Multer Memory Storage
-------------------------------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* --------------------------------------------------
API Routes
-------------------------------------------------- */

app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/patients", patientProgressImageRoutes);
app.use("/api/patients", patientProgressComparisonRoutes);
app.use("/api/patients", clinicalNoteRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/translate", translationRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/receptionists", receptionistRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/webhook", webhookRoutes);

app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/internal-pharmacy", internalPharmacyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoice-templates", templateRoutes);
app.use("/api/specializations", specializationRoutes);
app.use("/api/councils", councilRoutes);
app.use("/api/practices", practiceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/whatsapp-credits", whatsappCreditRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/investigations", investigationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/prescription-template", prescriptionTemplateRoutes);
app.use("/api/follow-up-reminders", followUpReminderRoutes);
app.use("/api/progress-notes", progressNoteRoutes);
app.use("/api/dev", devRoutes);

// Seed Data
seedGlobalComplaints();
seedDiagnosisMaster();
// seedMedicineMaster();
seedInvestigationMaster();

/* --------------------------------------------------
Image Upload API
-------------------------------------------------- */

app.post("/api/upload", (req, res) => {
  console.log("Upload request received");
  console.log("Headers:", req.headers['content-type']);
  
  upload.single("image")(req, res, async (err) => {
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

    try {
      const folderType = req.body.folderType || req.body.type || 'general';
      const organizationId = req.tenantId || req.body.organizationId || 'global';
      
      const s3Result = await uploadToS3({
        file: req.file,
        folderType,
        organizationId
      });

      // Use signedUrl if available for private access, else public fileUrl
      const imageUrl = s3Result.signedUrl || s3Result.fileUrl;

      console.log("File uploaded to S3 successfully. URL:", imageUrl);
      
      res.json({
        message: "Image uploaded successfully",
        imageUrl: imageUrl,
        s3Metadata: {
          storageProvider: s3Result.storageProvider,
          s3Bucket: s3Result.s3Bucket,
          s3Key: s3Result.s3Key
        }
      });
    } catch (uploadError) {
      console.error("S3 Upload Error:", uploadError);
      return res.status(500).json({
        message: "Failed to upload file to S3",
        error: uploadError.message
      });
    }
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
      const { setupAppointmentReminderCron } = await import(
        "./cron/appointmentReminderCron.js"
      );
      setupSubscriptionCron();
      setupTrialResetCron();
      setupAppointmentReminderCron();
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

/* --------------------------------------------------
 * Global Error Handlers
 * -------------------------------------------------- */

// Catch uncaught exceptions to prevent silent crash loops
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    syscall: err.syscall
  });
  
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    console.warn('Recoverable socket error caught. Keeping server alive.');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});