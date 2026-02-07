import mongoose from "mongoose";

const blogCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model("BlogCategory", blogCategorySchema);
