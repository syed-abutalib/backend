import BlogCategory from "../models/BlogCategory.js";
import slugify from "slugify";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

// Safe slugify function
const safeSlugify = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return slugify(text, { lower: true, strict: true });
};

// Create Blog Category
export const createBlogCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categorySlug = safeSlugify(name);

    const existingCategory = await BlogCategory.findOne({
      $or: [{ name: name.trim() }, { slug: categorySlug }],
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const categoryData = {
      name: name.trim(),
      slug: categorySlug,
      description: description ? description.trim() : "",
    };

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          "blog-categories",
        );

        categoryData.imageUrl = uploadResult.secure_url;
        categoryData.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    const blogCategory = new BlogCategory(categoryData);
    await blogCategory.save();

    res.status(201).json({
      success: true,
      message: "Blog category created successfully",
      data: blogCategory,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get All Blog Categories
export const getAllBlogCategories = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const query = {};

    if (status !== undefined) {
      query.status = status === "true";
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const categories = await BlogCategory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    const total = await BlogCategory.countDocuments(query);

    res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Blog Category
export const getBlogCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await BlogCategory.findOne({ slug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Blog category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Blog Category
export const updateBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const category = await BlogCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Blog category not found",
      });
    }

    // Check if new name already exists
    if (name && name.trim() !== category.name) {
      const existingCategory = await BlogCategory.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }

      category.name = name.trim();
      category.slug = safeSlugify(name);
    }

    if (description !== undefined)
      category.description = description ? description.trim() : "";
    if (status !== undefined) category.status = status;

    // Handle image update
    if (req.file) {
      try {
        // Delete old image if exists
        if (category.imagePublicId) {
          await deleteFromCloudinary(category.imagePublicId);
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          "blog-categories",
        );

        category.imageUrl = uploadResult.secure_url;
        category.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to update image",
        });
      }
    }

    await category.save();

    res.status(200).json({
      success: true,
      message: "Blog category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete Blog Category
export const deleteBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BlogCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Blog category not found",
      });
    }

    // Check if category has associated blogs
    const Blog = (await import("../models/Blog.js")).default;
    const blogCount = await Blog.countDocuments({
      category: id,
      isDeleted: false,
    });

    if (blogCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with associated blogs",
      });
    }

    // Delete image from Cloudinary
    if (category.imagePublicId) {
      await deleteFromCloudinary(category.imagePublicId);
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Blog category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Categories with Blog Count
export const getCategoriesWithCount = async (req, res) => {
  try {
    const Blog = (await import("../models/Blog.js")).default;

    const categories = await BlogCategory.aggregate([
      { $match: { status: true } },
      {
        $lookup: {
          from: "blogs",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$category", "$$categoryId"] },
                    { $eq: ["$status", "published"] },
                    { $eq: ["$isDeleted", false] },
                  ],
                },
              },
            },
          ],
          as: "blogs",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          description: 1,
          imageUrl: 1,
          blogCount: { $size: "$blogs" },
          createdAt: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories with count error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
