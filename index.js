import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";

// Routes import
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import attachmentRoutes from "./routes/attachmentRoutes.js";

// error middleware import
import { notFound, errorHandler } from "./middleware/error.js";

// Load the env variable
dotenv.config();

// Database connection
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error: ", err));

const app = express();

//   Middleware

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-type", "Authorization"],
  })
);

// Enable file uploads
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use(express.json());

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/attachments", attachmentRoutes);

// Basic route
app.get("/", (res) => {
  res.send("Welcome to the JIRA CLONE");
});

// error handling middleware
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
