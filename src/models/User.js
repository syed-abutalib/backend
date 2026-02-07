import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "blogger"], // Added blogger role
      default: "user",
    },
    bio: { type: String, trim: true },
    avatar: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    phone: { type: String },
    fullName: { type: String },
    gender: { type: String },
    location: { type: String },
    isVerified: { type: Boolean, default: true },
    avatarPublicId: { type: String },
    isApproved: { type: Boolean, default: true },
    // Add these missing fields that your controller expects
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add a virtual for name to use username as fallback
userSchema.virtual("displayName").get(function () {
  return this.name || this.username || "Unknown";
});

// Ensure virtuals are included in JSON output
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
