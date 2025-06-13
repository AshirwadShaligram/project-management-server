import Project from "../models/Project.js";
import Issue from "../models/Issue.js";
import Comment from "../models/Comment.js";
import asyncHandler from "express-async-handler";

// @desc    Check if user is project owner
export const checkProjectOwner = asyncHandler(async (req, res, next) => {
  const { projectId, id } = req.params;

  // Handle different route patterns
  const actualProjectId = projectId || id;

  const project = await Project.findById(actualProjectId);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner can perform this action"
    );
  }

  req.project = project;
  next();
});

// @desc    Check if user is project member
export const checkProjectMember = asyncHandler(async (req, res, next) => {
  const { projectId, id } = req.params;

  // Handle different route patterns
  const actualProjectId = projectId || id;

  const project = await Project.findById(actualProjectId);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  req.project = project;
  next();
});

// @desc    Check if user can modify issue (owner, reporter, or assignee)
export const checkIssuePermission = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const issue = await Issue.findById(id).populate("projectId");

  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const project = await Project.findById(issue.projectId._id);

  // Check if user is a member of the project first
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isReporter = issue.reporter.toString() === req.user._id.toString();
  const isAssignee = issue.assignee?.toString() === req.user._id.toString();

  // For read operations, any project member can access
  if (req.method === "GET") {
    req.project = project;
    req.issue = issue;
    return next();
  }

  // For write operations, check specific permissions
  if (!isProjectOwner && !isReporter && !isAssignee) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner, reporter, or assignee can modify this issue"
    );
  }

  req.project = project;
  req.issue = issue;
  next();
});

// @desc    Check if user can modify comment (owner or comment author)
export const checkCommentPermission = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const comment = await Comment.findById(id).populate({
    path: "issueId",
    populate: {
      path: "projectId",
      select: "name key owner member",
    },
  });

  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  const project = await Project.findById(comment.issueId.projectId._id);

  // Check if user is a member of the project first
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isCommentAuthor = comment.author.toString() === req.user._id.toString();

  // For read operations, any project member can access
  if (req.method === "GET") {
    req.project = project;
    req.comment = comment;
    return next();
  }

  // For write operations, check specific permissions
  if (!isProjectOwner && !isCommentAuthor) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner or comment author can modify this comment"
    );
  }

  req.project = project;
  req.comment = comment;
  next();
});

// @desc    Check if user can delete issue (owner or reporter only)
export const checkIssueDeletePermission = asyncHandler(
  async (req, res, next) => {
    const { id } = req.params;

    const issue = await Issue.findById(id).populate("projectId");

    if (!issue) {
      res.status(404);
      throw new Error("Issue not found");
    }

    const project = await Project.findById(issue.projectId._id);
    const isProjectOwner = project.owner.toString() === req.user._id.toString();
    const isReporter = issue.reporter.toString() === req.user._id.toString();

    // Only project owner or reporter can delete the issue
    if (!isProjectOwner && !isReporter) {
      res.status(403);
      throw new Error(
        "Access denied - Only project owner or issue reporter can delete this issue"
      );
    }

    req.project = project;
    req.issue = issue;
    next();
  }
);

// @desc    Get project from issue context
export const getProjectFromIssue = asyncHandler(async (req, res, next) => {
  const { issueId } = req.params;

  const issue = await Issue.findById(issueId).populate("projectId");

  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const project = await Project.findById(issue.projectId._id);

  // Check if user is a member of the project
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  req.project = project;
  req.issue = issue;
  next();
});

// @desc    Role-based permission check
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Access denied - Requires role: ${roles.join(" or ")}`);
    }
    next();
  };
};

// @desc    Check if user is admin
export const checkAdmin = checkRole(["admin"]);

// @desc    Check if user is admin or manager
export const checkAdminOrManager = checkRole(["admin", "manager"]);

// @desc    Validate project ownership for bulk operations
export const validateProjectOwnership = asyncHandler(async (req, res, next) => {
  const { projectIds } = req.body;

  if (!projectIds || !Array.isArray(projectIds)) {
    res.status(400);
    throw new Error("Project IDs array is required");
  }

  const projects = await Project.find({
    _id: { $in: projectIds },
    owner: req.user._id,
  });

  if (projects.length !== projectIds.length) {
    res.status(403);
    throw new Error("You can only perform this action on projects you own");
  }

  req.projects = projects;
  next();
});
