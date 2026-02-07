// routes/userRoutes.js
import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  createUser,
  toggleVerification,
  toggleApproval,
} from "../controllers/userController.js";
import { AdminMiddleware } from "../middlewares/AuthMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(AdminMiddleware);

// Get user stats (admin only)
router.get("/stats", getUserStats);

// Get all users (admin only, with filters)
router.get("/", getAllUsers);

// Create new user (admin only)
router.post("/", createUser);

// Get single user
router.get("/:id", getUserById);

// Update user
router.put("/:id", updateUser);

// Delete user (soft delete)
router.delete("/:id", deleteUser);

// Toggle user verification
router.patch("/:id/toggle-verification", toggleVerification);

// Toggle user approval
router.patch("/:id/toggle-approval", toggleApproval);

export default router;
