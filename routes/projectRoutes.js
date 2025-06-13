import express from "express";
const router = express.Router();
import { protect } from "../middleware/authMiddleware.js";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  inviteMember,
  acceptInvitation,
  removeMember,
  getProjectStats,
} from "../controller/projectController.js";
import {
  checkProjectOwner,
  checkProjectMember,
} from "../middleware/projectMiddleware.js";

router.post("/", protect, createProject);
router.get("/", protect, getProjects);
router.post("/accept-invite/:token", protect, acceptInvitation);

router.get("/:id", protect, checkProjectMember, getProject);
router.put("/:id", protect, checkProjectOwner, updateProject);
router.delete("/:id", protect, checkProjectOwner, deleteProject);
router.get("/:id/stats", protect, checkProjectMember, getProjectStats);

router.post("/:id/invite", protect, checkProjectOwner, inviteMember);
router.delete(
  "/:id/members/:memberId",
  protect,
  checkProjectOwner,
  removeMember
);

export default router;
