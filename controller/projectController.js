import Project from "../models/Project.js";
import User from "../models/User.js";
import Issue from "../models/Issue.js";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import sendEmail from "../utils/email.js";

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, key } = req.body;

  const projectExists = await Project.findOne({ key: key.toUpperCase() });

  if (projectExists) {
    res.status(400);
    throw new Error("Project with this key already exists");
  }

  const project = await Project.create({
    name,
    description,
    key: key.toUpperCase(),
    member: [req.user._id], // Creator becomes first member
    owner: req.user._id,
  });

  if (project) {
    const populatedProject = await Project.findById(project._id)
      .populate("member", "name email avatar role")
      .populate("owner", "name email avatar");

    res.status(201).json({
      success: true,
      data: populatedProject,
    });
  } else {
    res.status(400);
    throw new Error("Invalid project data");
  }
});

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
export const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    member: req.user._id,
  })
    .populate("member", "name email avatar role")
    .populate("owner", "name email avatar")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("member", "name email avatar role")
    .populate("owner", "name email avatar");

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is a member of the project
  const isMember = project.member.some(
    (member) => member._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  res.json({
    success: true,
    data: project,
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Project Owner Only)
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is project owner
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied - Only project owner can update project");
  }

  const { name, description, key } = req.body;

  // Check if new key conflicts with existing projects (if key is being changed)
  if (key && key.toUpperCase() !== project.key) {
    const keyExists = await Project.findOne({ key: key.toUpperCase() });
    if (keyExists) {
      res.status(400);
      throw new Error("Project with this key already exists");
    }
  }

  project.name = name || project.name;
  project.description = description || project.description;
  project.key = key ? key.toUpperCase() : project.key;

  const updatedProject = await project.save();
  const populatedProject = await Project.findById(updatedProject._id)
    .populate("member", "name email avatar role")
    .populate("owner", "name email avatar");

  res.json({
    success: true,
    data: populatedProject,
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Project Owner Only)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is project owner
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied - Only project owner can delete project");
  }

  // Delete all issues associated with this project
  await Issue.deleteMany({ projectId: req.params.id });

  await Project.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Project and associated issues deleted successfully",
  });
});

// @desc    Invite member to project
// @route   POST /api/projects/:id/invite
// @access  Private (Project Owner Only)
export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is project owner
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied - Only project owner can invite members");
  }

  // Check if user already exists and is already a member
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const isMember = project.member.some(
      (memberId) => memberId.toString() === existingUser._id.toString()
    );
    if (isMember) {
      res.status(400);
      throw new Error("User is already a member of this project");
    }
  }

  // Check if invitation already exists
  const existingInvite = project.pendingInvites.find(
    (invite) => invite.email === email
  );
  if (existingInvite) {
    res.status(400);
    throw new Error("Invitation already sent to this email");
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  project.pendingInvites.push({
    email,
    role: role || "developer",
    invitedBy: req.user._id,
    token: inviteToken,
    expiresAt,
  });

  await project.save();

  // Send invitation email
  const inviteUrl = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;
  const message = `You have been invited to join the project "${project.name}". Click the link below to accept the invitation:<br><br>
<a href="${inviteUrl}">${inviteUrl}</a><br><br>
This invitation will expire in 7 days.`;

  try {
    await sendEmail({
      email,
      subject: `Invitation to join ${project.name}`,
      html: message,
    });

    res.json({
      success: true,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    // Remove the invite if email failed
    project.pendingInvites = project.pendingInvites.filter(
      (invite) => invite.token !== inviteToken
    );
    await project.save();

    res.status(500);
    throw new Error("Failed to send invitation email");
  }
});

// @desc    Accept project invitation
// @route   POST /api/projects/accept-invite/:token
// @access  Private
export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const project = await Project.findOne({
    "pendingInvites.token": token,
    "pendingInvites.expiresAt": { $gt: new Date() },
  });

  if (!project) {
    res.status(400);
    throw new Error("Invalid or expired invitation token");
  }

  const invite = project.pendingInvites.find((inv) => inv.token === token);

  if (invite.email !== req.user.email) {
    res.status(403);
    throw new Error("This invitation is not for your email address");
  }

  // Check if user is already a member
  const isMember = project.member.some(
    (memberId) => memberId.toString() === req.user._id.toString()
  );

  if (!isMember) {
    project.member.push(req.user._id);
  }

  // Remove the used invitation
  project.pendingInvites = project.pendingInvites.filter(
    (inv) => inv.token !== token
  );

  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate("member", "name email avatar role")
    .populate("owner", "name email avatar");

  res.json({
    success: true,
    message: "Successfully joined the project",
    data: populatedProject,
  });
});

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:memberId
// @access  Private (Project Owner Only)
export const removeMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const project = await Project.findById(id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is project owner
  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied - Only project owner can remove members");
  }

  // Prevent owner from removing themselves
  if (memberId === req.user._id.toString()) {
    res.status(400);
    throw new Error("Project owner cannot remove themselves");
  }

  // Check if member exists in project
  const memberIndex = project.member.findIndex(
    (member) => member.toString() === memberId
  );

  if (memberIndex === -1) {
    res.status(404);
    throw new Error("Member not found in this project");
  }

  project.member.splice(memberIndex, 1);
  await project.save();

  res.json({
    success: true,
    message: "Member removed successfully",
  });
});

// @desc    Get project statistics
// @route   GET /api/projects/:id/stats
// @access  Private
export const getProjectStats = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is a member
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  const issues = await Issue.find({ projectId: req.params.id });

  const stats = {
    totalIssues: issues.length,
    todoIssues: issues.filter((issue) => issue.status === "todo").length,
    inProgressIssues: issues.filter((issue) => issue.status === "inprogress")
      .length,
    doneIssues: issues.filter((issue) => issue.status === "done").length,
    highPriorityIssues: issues.filter(
      (issue) => issue.priority === "high" || issue.priority === "urgent"
    ).length,
    memberCount: project.member.length,
  };

  res.json({
    success: true,
    data: stats,
  });
});
