import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video", "file", "pdf"],
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  },
  { timestamps: true }
);

// Add indexes for better performance
AttachmentSchema.index({ uploadedBy: 1 });
AttachmentSchema.index({ issueId: 1 });
AttachmentSchema.index({ commentId: 1 });

const Attachment = mongoose.model("Attachment", AttachmentSchema);
export default Attachment;
