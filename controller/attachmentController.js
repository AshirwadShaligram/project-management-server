import cloudinary from "cloudinary";
import Attachment from "../models/Attachment.js";
import asyncHandler from "express-async-handler";

// Configure Cloudinary (should be in your app config)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Upload attachment
// @route   POST /api/attachments
// @access  Private
export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const file = req.files.file;
  const maxSize = 25 * 1024 * 1024; // 25MB limit for videos/files

  // Validate file size
  if (file.size > maxSize) {
    res.status(400);
    throw new Error("File size too large (max 25MB)");
  }

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "video/mp4",
  ];
  if (!validTypes.includes(file.mimetype)) {
    res.status(400);
    throw new Error(
      "Invalid file type. Only images, PDFs, and MP4 videos are allowed"
    );
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      resource_type: "auto", // Automatically detect image/video/raw
      folder: "project_attachments",
    });

    // Determine attachment type based on Cloudinary response
    let attachmentType;
    if (result.resource_type === "image") {
      attachmentType = "image";
    } else if (result.resource_type === "video") {
      attachmentType = "video";
    } else {
      attachmentType = "file";
    }

    // Create attachment record
    const attachment = await Attachment.create({
      url: result.secure_url,
      type: attachmentType,
      publicId: result.public_id,
      uploadedBy: req.user._id,
      originalFilename: file.name,
      mimeType: file.mimetype,
      size: file.size,
    });

    res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500);
    throw new Error("File upload failed");
  }
});

// @desc    Delete attachment
// @route   DELETE /api/attachments/:id
// @access  Private (Attachment owner or admin)
export const deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);

  if (!attachment) {
    res.status(404);
    throw new Error("Attachment not found");
  }

  // Check if user is the uploader or admin
  const isOwner = attachment.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to delete this attachment");
  }

  try {
    // Delete from Cloudinary first
    await cloudinary.v2.uploader.destroy(attachment.publicId, {
      resource_type: attachment.type === "video" ? "video" : "image",
    });

    // Delete from database
    await Attachment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    res.status(500);
    throw new Error("Failed to delete attachment");
  }
});

// @desc    Get user's attachments
// @route   GET /api/attachments/my-attachments
// @access  Private
export const getMyAttachments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const attachments = await Attachment.find({ uploadedBy: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Attachment.countDocuments({ uploadedBy: req.user._id });

  res.json({
    success: true,
    count: attachments.length,
    total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: pageNum,
    data: attachments,
  });
});
