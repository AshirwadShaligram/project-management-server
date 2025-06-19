import express from "express";
const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";
import {
  uploadAttachment,
  deleteAttachment,
  getMyAttachments,
} from "../controller/attachmentController.js";
import { checkAttachmentPermission } from "../middleware/projectMiddleware.js";

// File upload routes
router.post("/", protect, uploadAttachment);
router.delete("/:id", protect, checkAttachmentPermission, deleteAttachment);
router.get("/my-attachments", protect, getMyAttachments);

export default router;
