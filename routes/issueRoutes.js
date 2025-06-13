import express from "express";
const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";
import {
  createIssue,
  getProjectIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus,
  getMyAssignedIssues,
  getMyReportedIssues,
} from "../controller/issueController.js";
import {
  checkProjectMember,
  checkIssuePermission,
  checkIssueDeletePermission,
  getProjectFromIssue,
} from "../middleware/projectMiddleware.js";

router.post(
  "/projects/:projectId/issues",
  protect,
  checkProjectMember,
  createIssue
);
router.get(
  "/projects/:projectId/issues",
  protect,
  checkProjectMember,
  getProjectIssues
);

router.get("/:id", protect, checkIssuePermission, getIssue);
router.put("/:id", protect, checkIssuePermission, updateIssue);
router.delete("/:id", protect, checkIssueDeletePermission, deleteIssue);

router.put("/:id/assign", protect, checkIssuePermission, assignIssue);
router.put("/:id/status", protect, checkIssuePermission, updateIssueStatus);

router.get("/assigned-to-me", protect, getMyAssignedIssues);
router.get("/reported-by-me", protect, getMyReportedIssues);

export default router;
