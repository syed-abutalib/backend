// routes/adminDashboardRoutes.js
import express from "express";
import { AdminMiddleware } from "../middlewares/AuthMiddleware.js";
import {
  getDashboardStats,
  getAnalytics,
  getUsersList,
  updateUserStatus,
  getAdminOverview,
  debugAllUsers,
} from "../controllers/adminDashboardController.js";

const router = express.Router();

// Define routes only if they don't exist

// Dashboard Stats
router.get("/stats", AdminMiddleware, getDashboardStats);

// Analytics
router.get("/analytics", AdminMiddleware, getAnalytics);

// Users Management
router.get("/users", AdminMiddleware, getUsersList);
router.put("/users/:id/status", AdminMiddleware, updateUserStatus);

// Overview
router.get("/overview", AdminMiddleware, getAdminOverview);
router.get('/debug/all-users', debugAllUsers);
export default router;
