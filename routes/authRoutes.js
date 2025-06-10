import express from "express";
const router = express.Router();
import {
  loginUser,
  registerUser,
  updateUserProfile,
  getUserProfile,
  forgotPassword,
  resetPassword,
} from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

router.post("/login", loginUser);
router.post("/register", registerUser);
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:resettoken", resetPassword);

export default router;
