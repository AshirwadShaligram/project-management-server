import Comment from "../models/Comment.js";
import Issue from "../models/Issue.js";
import Project from "../models/Project.js";
import Attachment from "../models/Attachment.js";
import asyncHandler from "express-async-handler";

// @desc    Create new comment
// @route   POST /api/issues/:issueId/comments
// @access  Private (Project Members)
export const createComment = asyncHandler(async (req, res) => {
  const { content, attachments } = req.body;
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

  // Validate attachments if provided
  if (attachments && attachments.length > 0) {
    const validAttachments = await Attachment.find({
      _id: { $in: attachments },
      uploadedBy: req.user._id,
    });

    if (validAttachments.length !== attachments.length) {
      res.status(400);
      throw new Error("Some attachments are invalid or not owned by you");
    }
  }

  const comment = await Comment.create({
    content,
    author: req.user._id,
    issueId,
    attachment: attachments || [],
  });

  // Add comment to issue
  issue.comments.push(comment._id);
  await issue.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "name email avatar")
    .populate("attachment");

  res.status(201).json({
    success: true,
    data: populatedComment,
  });
});

// @desc    Get all comments for an issue
// @route   GET /api/issues/:issueId/comments
// @access  Private (Project Members)
export const getIssueComments = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { page = 1, limit = 20 } = req.query;

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

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const comments = await Comment.find({ issueId })
    .populate("author", "name email avatar")
    .populate("attachment")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Comment.countDocuments({ issueId });

  res.json({
    success: true,
    count: comments.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: comments,
  });
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Private (Project Members)
export const getComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id)
    .populate("author", "name email avatar")
    .populate("attachment")
    .populate({
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

  const project = comment.issueId.projectId;

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
    data: comment,
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private (Comment Author or Project Owner)
export const updateComment = asyncHandler(async (req, res) => {
  const { content, attachments } = req.body;

  const comment = await Comment.findById(req.params.id).populate({
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

  const project = comment.issueId.projectId;
  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isCommentAuthor = comment.author.toString() === req.user._id.toString();

  // Only project owner or comment author can update the comment
  if (!isProjectOwner && !isCommentAuthor) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner or comment author can update this comment"
    );
  }

  // Validate attachments if provided
  if (attachments && attachments.length > 0) {
    const validAttachments = await Attachment.find({
      _id: { $in: attachments },
      uploadedBy: req.user._id,
    });

    if (validAttachments.length !== attachments.length) {
      res.status(400);
      throw new Error("Some attachments are invalid or not owned by you");
    }
  }

  comment.content = content || comment.content;
  comment.attachment =
    attachments !== undefined ? attachments : comment.attachment;

  const updatedComment = await comment.save();

  const populatedComment = await Comment.findById(updatedComment._id)
    .populate("author", "name email avatar")
    .populate("attachment");

  res.json({
    success: true,
    data: populatedComment,
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (Comment Author or Project Owner)
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id).populate({
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

  const project = comment.issueId.projectId;
  const isProjectOwner = project.owner.toString() === req.user._id.toString();
  const isCommentAuthor = comment.author.toString() === req.user._id.toString();

  // Only project owner or comment author can delete the comment
  if (!isProjectOwner && !isCommentAuthor) {
    res.status(403);
    throw new Error(
      "Access denied - Only project owner or comment author can delete this comment"
    );
  }

  // Remove comment from issue's comments array
  await Issue.findByIdAndUpdate(comment.issueId._id, {
    $pull: { comments: comment._id },
  });

  // Delete associated attachments
  if (comment.attachment && comment.attachment.length > 0) {
    await Attachment.deleteMany({ _id: { $in: comment.attachment } });
  }

  await Comment.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Comment and associated attachments deleted successfully",
  });
});

// @desc    Get comments by current user
// @route   GET /api/comments/my-comments
// @access  Private
export const getMyComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const comments = await Comment.find({ author: req.user._id })
    .populate("author", "name email avatar")
    .populate("attachment")
    .populate({
      path: "issueId",
      select: "key title status",
      populate: {
        path: "projectId",
        select: "name key",
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Comment.countDocuments({ author: req.user._id });

  res.json({
    success: true,
    count: comments.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: comments,
  });
});
