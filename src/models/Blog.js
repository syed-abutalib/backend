import mongoose from "mongoose";
import slugify from "slugify";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  slug: {
    type: String,
    unique: true, // ← This creates an index automatically
    lowercase: true,
    trim: true,
    required: true,
  },

  description: { type: String },
  excerpt: { type: String, trim: true },

  imageUrl: { type: String },
  imagePublicId: { type: String },

  status: {
    type: String,
    enum: ["draft", "pending", "published", "rejected"],
    default: "pending",
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BlogCategory",
    required: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isHot: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  readTime: { type: Number, default: 0 },
  tags: [
    {
      type: String,
      trim: true,
      lowercase: true,
    },
  ],

  keywords: [
    {
      type: String,
      trim: true,
      lowercase: true,
    },
  ],
  rejectionReason: {
    type: String,
    trim: true,
  },

  approvedAt: {
    type: Date,
  },

  rejectedAt: {
    type: Date,
  },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  createdAt: {
    type: Date,
    default: Date.now,
    set: function (date) {
      // Allow manual setting of createdAt
      return date;
    },
  },

  // ADD: updatedAt field
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: { type: Boolean, default: false },
});

// Indexes - REMOVE THE DUPLICATE slug INDEX
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ user: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ likes: -1 });
blogSchema.index({ isFeatured: 1 });
blogSchema.index({ isDeleted: 1 });

// Text search index for better search functionality
blogSchema.index({
  title: "text",
  description: "text",
  excerpt: "text",
  tags: "text",
});

// Compound indexes for common queries
blogSchema.index({ status: 1, category: 1, createdAt: -1 });
blogSchema.index({ user: 1, status: 1, createdAt: -1 });
blogSchema.index({ category: 1, isFeatured: 1, status: 1 });

// Auto slug + reading time
blogSchema.pre("validate", function (next) {
  // if (this.title && !this.slug) {
  //   this.slug = slugify(this.title, { lower: true, strict: true });
  // }

  if (this.description) {
    const words = this.description.split(" ").length;
    this.readTime = Math.ceil(words / 200); // Fixed: should be readTime, not min_read
  }

  next();
});

// Add a pre-save hook to update readTime if description changes
blogSchema.pre("save", function (next) {
  if (this.isModified("description") && this.description) {
    const words = this.description.split(" ").length;
    this.readTime = Math.ceil(words / 200);
  }
  this.updatedAt = new Date();

  next();
});

// Add pre-findOneAndUpdate middleware for findOneAndUpdate operations
blogSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.model("Blog", blogSchema);
