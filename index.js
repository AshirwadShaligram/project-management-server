import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Routes import
import authRoutes from "./routes/authRoutes.js";

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

app.use(express.json());

// Mount routes
app.use("/api/auth", authRoutes);

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
