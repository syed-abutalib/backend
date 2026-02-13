import Blog from "../models/Blog.js";
import slugify from "slugify";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { generateAndUploadSitemap } from "../utils/sitemapGenerator.js";

// ================ HELPER FUNCTIONS ================

const canEditBlog = (user, blog) => {
  if (!user || !blog) return false;

  // Admin can edit any blog
  if (user.role === "admin") return true;

  // User can only edit their own blogs
  return user._id.toString() === blog.user.toString();
};

const canDeleteBlog = (user, blog) => {
  if (!user || !blog) return false;

  // Admin can delete any blog
  if (user.role === "admin") return true;

  // User can only delete their own pending or rejected blogs
  if (user._id.toString() !== blog.user.toString()) return false;

  return blog.status === "pending" || blog.status === "rejected";
};

// Safe slugify function
const safeSlugify = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }
  return slugify(text, { lower: true, strict: true });
};

// ================ CONTROLLER FUNCTIONS ================

// Create Blog (Auto goes to pending for non-admin users)
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      description,
      excerpt,
      category,
      tags,
      slug,
      keywords,
      isFeatured = false,
      isHot = false,
      isPopular = false,
      createdAt,
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    // Determine status based on user role
    const userRole = req.user?.role;
    const status = userRole === "admin" ? "published" : "pending";

    // Prepare blog data
    const blogData = {
      title: title.trim(),
      description: description.trim(),
      excerpt: excerpt ? excerpt.trim() : "",
      slug: slug ? slug.trim() : safeSlugify(title),
      category,
      status,
      tags: tags ? tags.trim() : "",
      keywords: keywords ? keywords.trim() : "",
      user: userId,
      isFeatured: userRole === "admin" ? isFeatured : false,
      isHot: userRole === "admin" ? isHot : false,
      isPopular: userRole === "admin" ? isPopular : false,
      createdAt:
        createdAt && userRole === "admin" ? new Date(createdAt) : new Date(),
    };

    // Generate slug
    // blogData.slug = safeSlugify(title);

    // If admin creates, set approved time
    if (userRole === "admin") {
      blogData.approvedAt = new Date();
      await generateAndUploadSitemap();
    }

    // Calculate read time
    if (description) {
      const words = description.split(/\s+/).length;
      blogData.readTime = Math.ceil(words / 200);
    }

    // Handle image upload if exists
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs");

        blogData.imageUrl = uploadResult.secure_url;
        blogData.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload blog image",
        });
      }
    }

    const blog = new Blog(blogData);
    await blog.save();

    // Populate references
    await blog.populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email role" },
    ]);

    const message =
      userRole === "admin"
        ? "Blog published successfully"
        : "Blog created successfully and sent for approval";

    res.status(201).json({
      success: true,
      message,
      data: blog,
    });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error or Slug already exists",
      error: error.message,
    });
  }
};

// Get All Blogs with Approval Status Filter
export const getAllBlogs = async (req, res) => {
  try {
    const {
      status,
      category,
      user,
      isFeatured,
      isHot,
      isPopular,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      showAll = false,
    } = req.query;

    const userId = req.user?._id;
    const userRole = req.user?.role;

    // Build query
    const query = { isDeleted: false };

    // Non-admin users can only see their own blogs or published blogs
    if (userRole !== "admin" && !showAll) {
      query.$or = [{ user: userId }, { status: "published" }];
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (user) query.user = user;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
    if (isHot !== undefined) query.isHot = isHot === "true";
    if (isPopular !== undefined) query.isPopular = isPopular === "true";

    if (search && search.trim()) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search.trim(), $options: "i" } },
          { description: { $regex: search.trim(), $options: "i" } },
          { excerpt: { $regex: search.trim(), $options: "i" } },
        ],
      });
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const blogs = await Blog.find(query)
      .populate([
        { path: "category", select: "name slug" },
        { path: "user", select: "name email role" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Pending Blogs (Admin only)
export const getPendingBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Build query for pending blogs
    const query = {
      status: "pending",
      isDeleted: false,
    };

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { excerpt: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const blogs = await Blog.find(query)
      .populate([
        { path: "category", select: "name slug" },
        { path: "user", select: "name email" },
      ])
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get pending blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Approve Blog (Admin only)
export const approveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured = false, isHot = false, isPopular = false } = req.body;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if (blog.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Blog is already published",
      });
    }

    // Update blog status
    blog.status = "published";
    blog.approvedAt = new Date();
    blog.rejectedAt = undefined;
    blog.rejectionReason = undefined;

    // Only admin can set these flags
    blog.isFeatured = isFeatured;
    blog.isHot = isHot;
    blog.isPopular = isPopular;

    await blog.save();

    // Populate for response
    await blog.populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Blog approved and published successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Approve blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Reject Blog (Admin only)
export const rejectBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    if (blog.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject a published blog",
      });
    }

    // Update blog status
    blog.status = "rejected";
    blog.rejectionReason = rejectionReason;
    blog.rejectedAt = new Date();
    blog.approvedAt = undefined;

    await blog.save();

    // Populate for response
    await blog.populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Blog rejected successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Reject blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Request Re-approval (User can request after rejection)
export const requestReapproval = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const blog = await Blog.findById(id);

    if (!blog || blog.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check if user owns the blog
    if (blog.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
      });
    }

    // Only rejected blogs can be resubmitted
    if (blog.status !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Only rejected blogs can be resubmitted for approval",
      });
    }

    // Reset to pending and clear rejection info
    blog.status = "pending";
    blog.rejectionReason = undefined;
    blog.rejectedAt = undefined;

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog resubmitted for approval successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Request reapproval error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update Blog (with restrictions)
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=== UPDATE BLOG DEBUG ===");
    console.log("req.body.createdAt:", req.body.createdAt);

    const {
      title,
      description,
      excerpt,
      slug,
      category,
      isFeatured,
      isHot,
      isPopular,
      tags,
      keywords,
      createdAt,
    } = req.body;

    console.log("Destructured createdAt:", createdAt);

    const userId = req.user?._id;
    const userRole = req.user?.role;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    console.log("Current blog createdAt from DB:", blog.createdAt);

    // Check authorization
    if (userRole !== "admin" && blog.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
      });
    }

    if (blog.status === "published" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Published blogs cannot be edited. Please contact admin.",
      });
    }

    // Update fields
    if (title && title.trim() !== blog.title) {
      const existingBlog = await Blog.findOne({
        title: title.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "Blog with this title already exists",
        });
      }

      blog.title = title.trim();
    }
    if (slug && slug.trim() !== blog.slug) {
      const existingBlog = await Blog.findOne({
        slug: slug.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "Blog with this slug already exists",
        });
      }
      blog.slug = slug.trim();
    }

    if (description !== undefined) {
      blog.description = description.trim();
      const words = description.split(/\s+/).length;
      blog.readTime = Math.ceil(words / 200);
    }

    if (excerpt !== undefined) blog.excerpt = excerpt ? excerpt.trim() : "";
    if (category !== undefined) blog.category = category;

    // Update tags if provided
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags)
        ? tags
        : tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
    }

    // Update keywords if provided
    if (keywords !== undefined) {
      blog.keywords = Array.isArray(keywords)
        ? keywords
        : keywords
            .split(",")
            .map((kw) => kw.trim())
            .filter((kw) => kw);
    }

    // Only admin can set these flags and change status
    if (userRole === "admin") {
      console.log("User is admin, updating fields...");

      if (isFeatured !== undefined) blog.isFeatured = isFeatured;
      if (isHot !== undefined) blog.isHot = isHot;
      if (isPopular !== undefined) blog.isPopular = isPopular;

      // FIX: Properly handle createdAt update
      if (createdAt !== undefined && createdAt !== null && createdAt !== "") {
        console.log("Updating createdAt with value:", createdAt);

        // Parse the date properly
        let newDate;
        if (createdAt instanceof Date) {
          newDate = createdAt;
        } else if (typeof createdAt === "string") {
          newDate = new Date(createdAt);
        } else {
          newDate = new Date(createdAt);
        }

        console.log("Parsed date:", newDate);
        console.log("Is valid date?", !isNaN(newDate.getTime()));

        if (!isNaN(newDate.getTime())) {
          blog.createdAt = newDate;
          console.log("Successfully set blog.createdAt to:", blog.createdAt);
        } else {
          console.log("Invalid date, not updating createdAt");
        }
      } else {
        console.log("createdAt is undefined/null/empty, not updating");
      }

      // Admin can also change status (pending/published)
      if (req.body.status) {
        const newStatus = req.body.status.toLowerCase();
        if (["pending", "published", "rejected"].includes(newStatus)) {
          blog.status = newStatus;

          // Set approvedAt timestamp if publishing
          if (newStatus === "published") {
            blog.approvedAt = Date.now();
            blog.approvedBy = userId;
          } else if (newStatus === "rejected") {
            blog.rejectedAt = Date.now();
            blog.rejectedBy = userId;
            if (req.body.rejectionReason) {
              blog.rejectionReason = req.body.rejectionReason;
            }
          }
        }
      }
    } else {
      // For non-admin users:
      if (blog.status === "rejected") {
        blog.status = "pending";
        blog.rejectedAt = undefined;
        blog.rejectedBy = undefined;
        blog.rejectionReason = undefined;
      }
      blog.status = "pending";
      blog.approvedAt = undefined;
      blog.approvedBy = undefined;
    }

    console.log("Blog object before save - createdAt:", blog.createdAt);

    // Handle image update
    if (req.file) {
      try {
        if (blog.imagePublicId) {
          await deleteFromCloudinary(blog.imagePublicId);
        }

        const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs");

        blog.imageUrl = uploadResult.secure_url;
        blog.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to update blog image",
        });
      }
    }

    console.log("Saving blog...");
    await blog.save();

    console.log("After save - blog.createdAt:", blog.createdAt);

    // Re-populate references
    await blog.populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email role" },
    ]);

    console.log("Final createdAt to send:", blog.createdAt);
    console.log("=== END DEBUG ===");

    // Send different messages based on user role and status
    let message = "Blog updated successfully";
    if (userRole !== "admin") {
      if (blog.status === "pending") {
        message = "Blog updated successfully and submitted for approval";
      }
    } else {
      if (blog.status === "published") {
        message = "Blog published successfully";
      } else if (blog.status === "rejected") {
        message = "Blog rejected successfully";
      }
    }

    res.status(200).json({
      success: true,
      message,
      data: blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error or Slug already exists",
      error: error.message,
    });
  }
};
// Get user's specific blog (with ownership check)
export const getUserBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const blog = await Blog.findById(id)
      .populate({ path: "category", select: "name slug" })
      .populate({ path: "user", select: "name email" });

    if (!blog || blog.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check if user owns this blog (for non-admin users)
    if (
      blog.user._id.toString() !== userId.toString() &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this blog",
      });
    }

    // Don't show admin-only fields to regular users
    let blogData = blog.toObject();

    // Filter out admin-only fields for non-admin users
    if (req.user?.role !== "admin") {
      delete blogData.approvedBy;
      delete blogData.rejectedBy;
      // Keep other fields like status, approvedAt, rejectedAt, rejectionReason
      // as users should see these for their own blogs
    }

    res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: blogData,
    });
  } catch (error) {
    console.error("Get user blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
// User-specific update function
export const updateUserBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, excerpt, category, tags, keywords, slug } =
      req.body;

    const userId = req.user?._id;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check if user owns this blog
    if (blog.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog",
      });
    }

    // User can only edit pending or rejected blogs
    if (blog.status === "published") {
      return res.status(403).json({
        success: false,
        message: "Published blogs cannot be edited. Please contact admin.",
      });
    }

    // Update fields
    if (title && title.trim() !== blog.title) {
      // Check if new title already exists
      const existingBlog = await Blog.findOne({
        title: title.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "Blog with this title already exists",
        });
      }

      blog.title = title.trim();
    }

    if (slug && slug.trim() !== blog.slug) {
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({
        slug: slug.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "Blog with this slug already exists",
        });
      }
      blog.slug = slug.trim();
    }

    if (description !== undefined) {
      blog.description = description.trim();
      // Recalculate read time
      const words = description.split(/\s+/).length;
      blog.readTime = Math.ceil(words / 200);
    }

    if (excerpt !== undefined) blog.excerpt = excerpt ? excerpt.trim() : "";
    if (category !== undefined) blog.category = category;

    // Update tags if provided
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags)
        ? tags
        : tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
    }

    // Update keywords if provided
    if (keywords !== undefined) {
      blog.keywords = Array.isArray(keywords)
        ? keywords
        : keywords
            .split(",")
            .map((kw) => kw.trim())
            .filter((kw) => kw);
    }

    // Reset status to pending for user edits
    if (blog.status === "rejected") {
      blog.status = "pending";
      blog.rejectedAt = undefined;
      blog.rejectedBy = undefined;
      blog.rejectionReason = undefined;
    }
    blog.status = "pending";
    blog.approvedAt = undefined;
    blog.approvedBy = undefined;

    // Remove any admin-only flags if user tries to set them
    blog.isFeatured = false;
    blog.isHot = false;
    blog.isPopular = false;

    // Handle image update
    if (req.file) {
      try {
        // Delete old image if exists
        if (blog.imagePublicId) {
          await deleteFromCloudinary(blog.imagePublicId);
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs");

        blog.imageUrl = uploadResult.secure_url;
        blog.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to update blog image",
        });
      }
    }

    // Update updatedAt timestamp
    blog.updatedAt = Date.now();

    await blog.save();

    // Re-populate references
    await blog.populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Blog updated successfully and submitted for approval",
      data: blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
// Delete Blog (Soft Delete)
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const blog = await Blog.findById(id);

    if (!blog || blog.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const isOwner = blog.user.toString() === userId.toString();

    // Authorization check
    if (userRole !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this blog",
      });
    }

    // User cannot delete published blog
    if (userRole !== "admin" && blog.status === "published") {
      return res.status(403).json({
        success: false,
        message: "You cannot delete a published blog. Please contact admin.",
      });
    }

    // Delete image from Cloudinary (if exists)
    if (blog.imagePublicId) {
      await deleteFromCloudinary(blog.imagePublicId);
    }

    await blog.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Get User's Blogs with Status Filter
export const getUserBlogs = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {
      user: userId,
      isDeleted: false,
    };

    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const blogs = await Blog.find(query)
      .populate([{ path: "category", select: "name slug" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Blog.countDocuments(query);

    // Get status counts for user
    const statusCounts = await Blog.aggregate([
      { $match: { user: userId, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: blogs,
      stats: statusCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get user blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Published Blogs (Public)
export const getPublishedBlogs = async (req, res) => {
  try {
    const {
      category,
      featured,
      hot,
      popular,
      search,
      page = 1,
      limit = 9,
    } = req.query;

    // Build query for published blogs
    const query = {
      status: "published",
      isDeleted: false,
    };

    if (category) query.category = category;
    if (featured === "true") query.isFeatured = true;
    if (hot === "true") query.isHot = true;
    if (popular === "true") query.isPopular = true;

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { excerpt: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 9;
    const skip = (pageNum - 1) * limitNum;

    const blogs = await Blog.find(query)
      .populate([
        { path: "category", select: "name slug" },
        { path: "user", select: "name email" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .where("status")
      .equals("published")
      .select(
        "title slug excerpt imageUrl readTime views likes createdAt category user description isHot isPopular isFeatured",
      );

    const total = await Blog.countDocuments(query);

    // Get trending blogs (most viewed in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // const trendingBlogs = await Blog.find({
    //   ...query,
    //   createdAt: { $gte: oneWeekAgo },
    // })
    const trendingBlogs = await Blog.find({ createdAt: { $gte: oneWeekAgo } })
      .populate([{ path: "category", select: "name slug" }])
      .limit(10)
      .where("status")
      .equals("published")
      .select(
        "title slug imageUrl views createdAt category description excerpt isHot isPopular isFeatured",
      );

    res.status(200).json({
      success: true,
      data: blogs,
      trending: trendingBlogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get published blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Single Blog by Slug
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({
      slug,
      isDeleted: false,
    }).populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email" },
    ]);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Only show published blogs to public
    if (blog.status !== "published") {
      const userId = req.user?._id;
      const userRole = req.user?.role;

      // Check if user is admin or owner
      if (
        !userId ||
        (userRole !== "admin" && blog.user._id.toString() !== userId.toString())
      ) {
        return res.status(404).json({
          success: false,
          message: "Blog not found",
        });
      }
    }

    // Increment view count only for published blogs
    if (blog.status === "published") {
      blog.views += 1;
      await blog.save();
    }

    // Get related blogs (same category, published only)
    const relatedBlogs = await Blog.find({
      category: blog.category,
      _id: { $ne: blog._id },
      status: "published",
      isDeleted: false,
    })
      .limit(4)
      .select("title slug excerpt imageUrl readTime views createdAt")
      .sort({ views: -1 });

    res.status(200).json({
      success: true,
      data: blog,
      related: relatedBlogs,
    });
  } catch (error) {
    console.error("Get blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Like/Unlike Blog
export const toggleLikeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog || blog.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Only allow liking published blogs
    if (blog.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Only published blogs can be liked",
      });
    }

    const isLiked = blog.likedBy.includes(userId);

    if (isLiked) {
      // Unlike
      blog.likedBy.pull(userId);
      blog.likes = Math.max(0, blog.likes - 1);
    } else {
      // Like
      blog.likedBy.push(userId);
      blog.likes += 1;
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: isLiked ? "Blog unliked" : "Blog liked",
      data: {
        likes: blog.likes,
        isLiked: !isLiked,
      },
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Bookmark/Unbookmark Blog
export const toggleBookmarkBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog || blog.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const isBookmarked = blog.bookmarkedBy.includes(userId);

    if (isBookmarked) {
      // Remove bookmark
      blog.bookmarkedBy.pull(userId);
      blog.bookmarks = Math.max(0, blog.bookmarks - 1);
    } else {
      // Add bookmark
      blog.bookmarkedBy.push(userId);
      blog.bookmarks += 1;
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: isBookmarked ? "Bookmark removed" : "Blog bookmarked",
      data: {
        bookmarks: blog.bookmarks,
        isBookmarked: !isBookmarked,
      },
    });
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get User's Blog Bookmarks
export const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const blogs = await Blog.find({
      bookmarkedBy: userId,
      isDeleted: false,
      status: "published",
    })
      .populate([
        { path: "category", select: "name slug" },
        { path: "user", select: "name email" },
      ])
      .sort({ createdAt: -1 })
      .select("title slug excerpt imageUrl readTime views likes createdAt");

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Blog Stats
export const getBlogStats = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    let matchQuery = { isDeleted: false };

    // Non-admin users only see their own blogs
    if (userRole !== "admin") {
      matchQuery.user = userId;
    }

    const totalBlogs = await Blog.countDocuments(matchQuery);

    const publishedBlogs = await Blog.countDocuments({
      ...matchQuery,
      status: "published",
    });

    const pendingBlogs = await Blog.countDocuments({
      ...matchQuery,
      status: "pending",
    });

    const rejectedBlogs = await Blog.countDocuments({
      ...matchQuery,
      status: "rejected",
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalBlogs,
        published: publishedBlogs,
        pending: pendingBlogs,
        rejected: rejectedBlogs,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Admin Delete Blog (Force delete)
export const adminDeleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete image from Cloudinary
    if (blog.imagePublicId) {
      await deleteFromCloudinary(blog.imagePublicId);
    }

    // Hard delete
    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: "Blog permanently deleted by admin",
    });
  } catch (error) {
    console.error("Admin delete blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// blogController.js - Add these functions

// Get any blog by ID (Admin only or owner)
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find blog by ID
    const blog = await Blog.findById(id)
      .populate("category", "name slug")
      .populate("user", "name email role avatar")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check permissions
    const isAdmin = req.user?.role === "admin";
    const isOwner = blog.user?._id.toString() === req.user?._id.toString();

    // Non-admin users can only view their own blogs or published blogs
    if (!isAdmin && !isOwner && blog.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this blog",
      });
    }

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Get blog by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin update any blog (with status control)
export const adminUpdateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      excerpt,
      category,
      slug,
      tags,
      keywords,
      status, // Admin can change status
      isFeatured,
      isHot,
      isPopular,
      createdAt,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    // Find the blog
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Prepare update data
    const updateData = {
      title: title.trim(),
      description: description.trim(),
      excerpt: excerpt ? excerpt.trim() : "",
      slug: slug ? slug.trim() : blog.slug,
      category,
      tags: tags ? tags.trim() : "",
      keywords: keywords ? keywords.trim() : "",
      isFeatured: isFeatured || false,
      isHot: isHot || false,
      isPopular: isPopular || false,
      createdAt: createdAt ? new Date(createdAt) : blog.createdAt,
    };

    // Admin can change status
    if (
      status &&
      ["draft", "pending", "published", "rejected"].includes(status)
    ) {
      updateData.status = status;

      // If publishing, set approved time
      if (status === "published") {
        updateData.approvedAt = new Date();
      }
    }

    // Generate slug if title changed
    // if (title !== blog.title) {
    //   updateData.slug = safeSlugify(title);
    // }

    // Calculate read time if description changed
    if (description !== blog.description) {
      const words = description.split(/\s+/).length;
      updateData.readTime = Math.ceil(words / 200);
    }

    // Handle image upload if exists
    if (req.file) {
      try {
        // Delete old image if exists
        if (blog.imagePublicId) {
          await deleteFromCloudinary(blog.imagePublicId);
        }

        const uploadResult = await uploadToCloudinary(req.file.buffer, "blogs");
        updateData.imageUrl = uploadResult.secure_url;
        updateData.imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload blog image",
        });
      }
    }

    // Update the blog
    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "category", select: "name slug" },
      { path: "user", select: "name email role" },
    ]);

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Admin update blog error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all blogs for admin (with filters)
export const adminGetAllBlogs = async (req, res) => {
  try {
    const {
      status,
      search,
      category,
      user,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    let query = {};

    // Status filter
    if (
      status &&
      ["draft", "pending", "published", "rejected"].includes(status)
    ) {
      query.status = status;
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // User filter
    if (user) {
      query.user = user;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort
    const sortOrder = order === "desc" ? -1 : 1;
    const sortQuery = { [sort]: sortOrder };

    // Get total count
    const total = await Blog.countDocuments(query);

    // Get blogs with pagination
    const blogs = await Blog.find(query)
      .populate("category", "name slug")
      .populate("user", "name email role")
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate stats
    const stats = {
      total: await Blog.countDocuments(),
      published: await Blog.countDocuments({ status: "published" }),
      pending: await Blog.countDocuments({ status: "pending" }),
      draft: await Blog.countDocuments({ status: "draft" }),
      rejected: await Blog.countDocuments({ status: "rejected" }),
    };

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats,
    });
  } catch (error) {
    console.error("Admin get all blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
