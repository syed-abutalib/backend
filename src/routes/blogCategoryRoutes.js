import express from "express";
import {
  createBlogCategory,
  getAllBlogCategories,
  getBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getCategoriesWithCount,
} from "../controllers/blogCategoryController.js";
import { uploadSingleImage } from "../middlewares/upload.js";
import {
  AdminMiddleware,
  AuthMiddleware,
} from "../middlewares/AuthMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllBlogCategories);
router.get("/with-count", getCategoriesWithCount);
router.get("/:slug", getBlogCategory);

// Admin only routes
router.use(AuthMiddleware);
router.use(AdminMiddleware);

router.post("/", uploadSingleImage("image"), createBlogCategory);
router.put("/:id", uploadSingleImage("image"), updateBlogCategory);
router.delete("/:id", deleteBlogCategory);

export default router;
