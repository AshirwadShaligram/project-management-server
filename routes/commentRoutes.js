import express from "express";
const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";
import {
  createComment,
  getIssueComments,
  getComment,
  updateComment,
  deleteComment,
  getMyComments,
} from "../controller/commentController.js";
import {
  checkCommentPermission,
  getProjectFromIssue,
} from "../middleware/projectMiddleware.js";

router.post(
  "/issues/:issueId/comments",
  protect,
  getProjectFromIssue,
  createComment
);
router.get(
  "/issues/:issueId/comments",
  protect,
  getProjectFromIssue,
  getIssueComments
);

router.get("/:id", protect, checkCommentPermission, getComment);
router.put("/:id", protect, checkCommentPermission, updateComment);
router.delete("/:id", protect, checkCommentPermission, deleteComment);

router.get("/my-comments", protect, getMyComments);

export default router;
