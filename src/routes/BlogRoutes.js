import express from "express";
import {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  toggleLikeBlog,
  toggleBookmarkBlog,
  getUserBookmarks,
  getBlogStats,
  getPendingBlogs,
  approveBlog,
  rejectBlog,
  requestReapproval,
  getUserBlogs,
  adminDeleteBlog,
  updateUserBlog,
  getUserBlog,
  getBlogById,
  adminGetAllBlogs,
  adminUpdateBlog,
} from "../controllers/blogController.js";
import {
  AuthMiddleware,
  AdminMiddleware,
} from "../middlewares/AuthMiddleware.js";
import { uploadSingleImage } from "../middlewares/upload.js";

const router = express.Router();

// ================ PUBLIC ROUTES ================
router.get("/published", getPublishedBlogs);
router.get("/slug/:slug", getBlogBySlug);

// ================ PROTECTED ROUTES (REQUIRE AUTH) ================
router.use(AuthMiddleware);

router.get("/my-blogs", getUserBlogs);
router.get("/stats", getBlogStats);
router.get("/:id", getBlogById);

// User blog management
router.post("/", uploadSingleImage("image"), createBlog);
router.get("/user/:id", getUserBlog); // ✅ Add this GET endpoint
router.put("/request-reapproval/:id", requestReapproval);

// Blog interactions (likes, bookmarks)
router.put("/:id/like", toggleLikeBlog);
router.put("/:id/bookmark", toggleBookmarkBlog);
router.get("/my-bookmarks", getUserBookmarks);

// User can update their own blogs
router.put("/user/:id", uploadSingleImage("image"), updateUserBlog);
router.put("/:id", uploadSingleImage("image"), updateBlog);

// User can delete only their pending/rejected blogs
router.delete("/:id", deleteBlog);

// ================ ADMIN ONLY ROUTES ================
router.use(AdminMiddleware);

// Admin blog management
router.get("/", adminGetAllBlogs); // Admin gets all blogs with filters
router.get("/pending", getPendingBlogs);
router.get("/", getAllBlogs); // Admin gets all blogs
router.put("/approve/:id", approveBlog);
router.put("/reject/:id", rejectBlog);
router.put("/admin/:id", uploadSingleImage("image"), adminUpdateBlog); // Admin can update any blog

router.delete("/admin/:id", adminDeleteBlog); // Admin can hard delete any blog

export default router;
