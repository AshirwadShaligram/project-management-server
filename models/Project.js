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
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        token: String,
        expiresAt: Date,
      },
    ],
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", ProjectSchema);
export default Project;
