import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    member: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pendingInvites: [
      {
        email: String,
        role: {
          type: String,
          enum: ["manager", "developer", "viewer"],
          default: "developer",
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        token: String,
        expiresAt: Date,
      },
    ],
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      issuePrefix: {
        type: String,
        default: "",
      },
      defaultAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  },
  { timestamps: true }
);

// Index for better performance
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ member: 1 });

// Virtual for issue count
ProjectSchema.virtual("issueCount", {
  ref: "Issue",
  localField: "_id",
  foreignField: "projectId",
  count: true,
});

// Ensure owner is always a member
ProjectSchema.pre("save", function (next) {
  if (this.owner && !this.member.includes(this.owner)) {
    this.member.unshift(this.owner);
  }
  next();
});

const Project = mongoose.model("Project", ProjectSchema);
export default Project;
