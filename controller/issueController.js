import Issue from "../models/Issue.js";
import Project from "../models/Project.js";
import Comment from "../models/Comment.js";
import Attachment from "../models/Attachment.js";
import asyncHandler from "express-async-handler";

// @desc    Create new issue
// @route   POST /api/projects/:projectId/issues
// @access  Private (Project Members)
export const createIssue = asyncHandler(async (req, res) => {
  const { title, description, priority, assignee, tags, dueDate } = req.body;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is a member of the project
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  // Validate assignee is a project member if provided
  if (assignee) {
    const isAssigneeMember = project.member.some(
      (member) => member.toString() === assignee
    );
    if (!isAssigneeMember) {
      res.status(400);
      throw new Error("Assignee must be a project member");
    }
  }

  // Generate unique key for issue
  const issueCount = await Issue.countDocuments({ projectId });
  const issueKey = `${project.key}-${issueCount + 1}`;

  const issue = await Issue.create({
    key: issueKey,
    title,
    description,
    priority: priority || "medium",
    assignee: assignee || null,
    reporter: req.user._id,
    projectId,
    tags: tags || [],
    dueDate: dueDate || null,
  });

  const populatedIssue = await Issue.findById(issue._id)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "name email avatar",
      },
    });

  res.status(201).json({
    success: true,
    data: populatedIssue,
  });
});

// @desc    Get all issues for a project
// @route   GET /api/projects/:projectId/issues
// @access  Private (Project Members)
export const getProjectIssues = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    status,
    priority,
    assignee,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const project = await Project.findById(projectId);

  if (!project) {
    res.status(404);
    throw new Error("Project not found");
  }

  // Check if user is a member of the project
  const isMember = project.member.some(
    (member) => member.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Access denied - Not a project member");
  }

  // Build filter object
  let filter = { projectId };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignee = assignee;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { key: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const issues = await Issue.find(filter)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Issue.countDocuments(filter);

  res.json({
    success: true,
    count: issues.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: issues,
  });
});

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private (Project Members)
export const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key owner")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "name email avatar",
      },
    })
    .populate("attachments");

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

  res.json({
    success: true,
    data: issue,
  });
});

// @desc    Update issue
// @route   PUT /api/issues/:id
// @access  Private (Project Members, Project Owner can update any)
export const updateIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id).populate("projectId");

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

  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isReporter = issue.reporter.toString() === req.user._id.toString();

  // Only project owner, reporter, or assignee can update the issue
  if (
    !isProjectOwner &&
    !isReporter &&
    issue.assignee?.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner, reporter, or assignee can update this issue"
    );
  }

  const { title, description, status, priority, assignee, tags, dueDate } =
    req.body;

  // Validate assignee is a project member if provided
  if (assignee) {
    const isAssigneeMember = project.member.some(
      (member) => member.toString() === assignee
    );
    if (!isAssigneeMember) {
      res.status(400);
      throw new Error("Assignee must be a project member");
    }
  }

  issue.title = title || issue.title;
  issue.description = description || issue.description;
  issue.status = status || issue.status;
  issue.priority = priority || issue.priority;
  issue.assignee = assignee !== undefined ? assignee : issue.assignee;
  issue.tags = tags || issue.tags;
  issue.dueDate = dueDate !== undefined ? dueDate : issue.dueDate;

  const updatedIssue = await issue.save();

  const populatedIssue = await Issue.findById(updatedIssue._id)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "name email avatar",
      },
    });

  res.json({
    success: true,
    data: populatedIssue,
  });
});

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private (Project Owner or Issue Reporter)
export const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id).populate("projectId");

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

  // Delete all comments associated with this issue
  await Comment.deleteMany({ issueId: req.params.id });

  // Delete all attachments associated with this issue
  await Attachment.deleteMany({ _id: { $in: issue.attachments } });

  await Issue.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Issue and associated data deleted successfully",
  });
});

// @desc    Assign issue to user
// @route   PUT /api/issues/:id/assign
// @access  Private (Project Members)
export const assignIssue = asyncHandler(async (req, res) => {
  const { assigneeId, assignee } = req.body;
  const targetAssignee = assigneeId || assignee;

  const issue = await Issue.findById(req.params.id).populate("projectId");

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

  // Validate assignee is a project member if provided
  if (targetAssignee) {
    const isAssigneeMember = project.member.some(
      (member) => member.toString() === targetAssignee
    );

    if (!isAssigneeMember) {
      res.status(400);
      throw new Error("Assignee must be a project member");
    }
  }

  // Update assignee
  issue.assignee = targetAssignee || null;
  await issue.save();

  // Return populated assignee data
  const populatedIssue = await Issue.findById(issue._id)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key");

  res.json({
    success: true,
    data: populatedIssue,
  });
});

// @desc    Update issue status
// @route   PUT /api/issues/:id/status
// @access  Private (Assignee only)
export const updateIssueStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const issue = await Issue.findById(req.params.id).populate("projectId");

  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  // Check if user is the assignee
  if (
    !issue.assignee ||
    issue.assignee.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Access denied - Only the assignee can update the status");
  }

  if (!["todo", "inprogress", "done"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  issue.status = status;
  await issue.save();

  const populatedIssue = await Issue.findById(issue._id)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key");

  res.json({
    success: true,
    data: populatedIssue,
  });
});

// @desc    Get issues assigned to current user
// @route   GET /api/issues/assigned-to-me
// @access  Private
export const getMyAssignedIssues = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;

  // Build filter object
  let filter = { assignee: req.user._id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const issues = await Issue.find(filter)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Issue.countDocuments(filter);

  res.json({
    success: true,
    count: issues.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: issues,
  });
});

// @desc    Get issues reported by current user
// @route   GET /api/issues/reported-by-me
// @access  Private
export const getMyReportedIssues = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;

  // Build filter object
  let filter = { reporter: req.user._id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const issues = await Issue.find(filter)
    .populate("reporter", "name email avatar")
    .populate("assignee", "name email avatar")
    .populate("projectId", "name key")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Issue.countDocuments(filter);

  res.json({
    success: true,
    count: issues.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: issues,
  });
});
