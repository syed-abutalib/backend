// controllers/adminDashboardController.js - COMPLETE FIXED VERSION
import mongoose from "mongoose";
import Blog from "../models/Blog.js";
import User from "../models/User.js";
import BlogCategory from "../models/BlogCategory.js";

// Helper function to format time ago
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
};

// Get Dashboard Statistics - FIXED VERSION
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    // Get counts - FIXED: Count all users
    const getCounts = async () => {
      try {
        const [
          totalUsers,
          totalBlogs,
          publishedBlogs,
          pendingBlogs,
          rejectedBlogs,
          totalViews,
          totalLikes,
          todayUsers,
          todayBlogs,
          monthlyRevenue,
        ] = await Promise.all([
          // FIXED: Count all users without filter
          User.countDocuments(),

          // Blogs count with isDeleted check
          Blog.countDocuments({ isDeleted: false }),
          Blog.countDocuments({ status: "published", isDeleted: false }),
          Blog.countDocuments({ status: "pending", isDeleted: false }),
          Blog.countDocuments({ status: "rejected", isDeleted: false }),

          Blog.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: "$views" } } },
          ]),
          Blog.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: "$likes" } } },
          ]),

          // Today's users - FIXED: Count all users created today
          User.countDocuments({
            createdAt: { $gte: startOfToday },
          }),

          Blog.countDocuments({
            createdAt: { $gte: startOfToday },
            isDeleted: false,
          }),

          // Simulate revenue data
          Promise.resolve({ total: Math.floor(Math.random() * 10000) + 5000 }),
        ]);

        return {
          totalUsers,
          totalBlogs,
          publishedBlogs,
          pendingBlogs,
          rejectedBlogs,
          totalViews: totalViews[0]?.total || 0,
          totalLikes: totalLikes[0]?.total || 0,
          todayUsers,
          todayBlogs,
          monthlyRevenue: monthlyRevenue.total,
        };
      } catch (error) {
        console.error("Error getting counts:", error);
        throw error;
      }
    };

    // Get user growth data - FIXED: Count all users
    const getUserGrowthData = async () => {
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Generate all months even if no data
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleString("default", { month: "short" });
          months.push({
            name: `${monthName} ${date.getFullYear()}`,
            users: 0,
          });
        }

        // FIXED: Count all users, not just active
        const monthlyUsers = await User.aggregate([
          {
            $match: {
              createdAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1 },
          },
        ]);

        // Merge actual data with months array
        monthlyUsers.forEach((item) => {
          const monthName = new Date(
            item._id.year,
            item._id.month - 1,
          ).toLocaleString("default", { month: "short" });
          const name = `${monthName} ${item._id.year}`;
          const monthIndex = months.findIndex((m) => m.name === name);
          if (monthIndex !== -1) {
            months[monthIndex].users = item.count;
          }
        });

        return months;
      } catch (error) {
        console.error("Error getting user growth data:", error);
        return [];
      }
    };

    // Get blog statistics
    const getBlogStatsData = async () => {
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Generate all months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleString("default", { month: "short" });
          months.push({
            name: `${monthName} ${date.getFullYear()}`,
            published: 0,
            pending: 0,
            rejected: 0,
          });
        }

        const monthlyBlogs = await Blog.aggregate([
          {
            $match: {
              createdAt: { $gte: sixMonthsAgo },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                status: "$status",
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1 },
          },
        ]);

        // Merge data
        monthlyBlogs.forEach((item) => {
          const monthName = new Date(
            item._id.year,
            item._id.month - 1,
          ).toLocaleString("default", { month: "short" });
          const name = `${monthName} ${item._id.year}`;
          const monthIndex = months.findIndex((m) => m.name === name);
          if (monthIndex !== -1) {
            months[monthIndex][item._id.status] = item.count;
          }
        });

        return months;
      } catch (error) {
        console.error("Error getting blog stats:", error);
        return [];
      }
    };

    // Get category distribution
    const getCategoryDistribution = async () => {
      try {
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
              name: 1,
              blogCount: { $size: "$blogs" },
            },
          },
          { $sort: { blogCount: -1 } },
          { $limit: 5 },
        ]);

        const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B"];

        return categories.map((cat, index) => ({
          name: cat.name,
          value: cat.blogCount,
          color: colors[index] || "#6B7280",
        }));
      } catch (error) {
        console.error("Error getting category distribution:", error);
        return [];
      }
    };

    // Get top blogs
    const getTopBlogs = async () => {
      try {
        const topBlogs = await Blog.find({ isDeleted: false })
          .sort({ views: -1, likes: -1 })
          .limit(5)
          .populate("category", "name")
          .populate("user", "username name email")
          .select("title views likes comments bookmarks category user");

        return topBlogs.map((blog) => ({
          id: blog._id,
          title: blog.title,
          views: blog.views || 0,
          likes: blog.likes || 0,
          comments: blog.comments?.length || 0,
          bookmarks: blog.bookmarks || 0,
          category: blog.category?.name || "Uncategorized",
          author: blog.user?.username || blog.user?.name || "Unknown",
        }));
      } catch (error) {
        console.error("Error getting top blogs:", error);
        return [];
      }
    };

    // Get recent activities - FIXED: Include all users
    const getRecentActivities = async () => {
      try {
        // Get recent blog activities
        const recentBlogs = await Blog.find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "username name email")
          .select("title status user createdAt");

        // FIXED: Get all users, not just active
        const recentUsers = await User.find({})
          .sort({ createdAt: -1 })
          .limit(2)
          .select("username name createdAt");

        const activities = [];

        // Add blog activities
        recentBlogs.forEach((blog) => {
          let action = "";
          let type = "";

          switch (blog.status) {
            case "published":
              action = "published a new blog";
              type = "publish";
              break;
            case "pending":
              action = "submitted blog for review";
              type = "submit";
              break;
            case "rejected":
              action = "blog was rejected";
              type = "reject";
              break;
          }

          activities.push({
            id: blog._id,
            user: blog.user?.username || blog.user?.name || "Unknown",
            action,
            type,
            time: formatTimeAgo(blog.createdAt),
          });
        });

        // Add user registration activities
        recentUsers.forEach((user) => {
          activities.push({
            id: user._id,
            user: user.username || user.name || "Unknown",
            action: "registered as new user",
            type: "register",
            time: formatTimeAgo(user.createdAt),
          });
        });

        // Sort by time (newest first) and take top 5
        return activities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5);
      } catch (error) {
        console.error("Error getting recent activities:", error);
        return [];
      }
    };

    // Get pending reviews
    const getPendingReviews = async () => {
      try {
        const pendingBlogs = await Blog.find({
          status: "pending",
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "username name email")
          .populate("category", "name")
          .select("title user createdAt");

        return pendingBlogs.map((blog) => ({
          id: blog._id,
          title: blog.title,
          author: blog.user?.username || blog.user?.name || "Unknown",
          category: blog.category?.name || "Uncategorized",
          submitted: formatTimeAgo(blog.createdAt),
        }));
      } catch (error) {
        console.error("Error getting pending reviews:", error);
        return [];
      }
    };

    // Get all data concurrently
    const [
      counts,
      userGrowthData,
      blogStatsData,
      categoryDistribution,
      topBlogs,
      recentActivities,
      pendingReviews,
    ] = await Promise.all([
      getCounts(),
      getUserGrowthData(),
      getBlogStatsData(),
      getCategoryDistribution(),
      getTopBlogs(),
      getRecentActivities(),
      getPendingReviews(),
    ]);

    // FIXED: Get actual active users count separately
    const activeUsersCount = await User.countDocuments({ status: "active" });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: counts.totalUsers,
          totalBlogs: counts.totalBlogs,
          publishedBlogs: counts.publishedBlogs,
          pendingBlogs: counts.pendingBlogs,
          rejectedBlogs: counts.rejectedBlogs,
          totalViews: counts.totalViews,
          totalLikes: counts.totalLikes,
          todayUsers: counts.todayUsers,
          todayBlogs: counts.todayBlogs,
          monthlyRevenue: counts.monthlyRevenue,
          activeUsers: activeUsersCount,
        },
        charts: {
          userGrowth: userGrowthData,
          blogStats: blogStatsData,
          categoryDistribution,
        },
        topBlogs,
        recentActivities,
        pendingReviews,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

// Get Detailed Analytics - FIXED
export const getAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    let startDate;
    const endDate = new Date();

    switch (period) {
      case "week":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get blog analytics
    const blogAnalytics = await Blog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get user analytics - FIXED: Count all users
    const userAnalytics = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get category analytics
    const categoryAnalytics = await Blog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgViews: { $avg: "$views" },
          avgLikes: { $avg: "$likes" },
        },
      },
      {
        $lookup: {
          from: "blogcategories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          category: "$categoryInfo.name",
          count: 1,
          avgViews: { $round: ["$avgViews", 2] },
          avgLikes: { $round: ["$avgLikes", 2] },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        blogAnalytics,
        userAnalytics,
        categoryAnalytics,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

// Get Users List for Admin - FIXED
export const getUsersList = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;

    // Query all users by default
    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { username: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      query.role = role;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-password -__v");

    const total = await User.countDocuments(query);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0],
            },
          },
          inactive: {
            $sum: {
              $cond: [{ $eq: ["$status", "inactive"] }, 1, 0],
            },
          },
          suspended: {
            $sum: {
              $cond: [{ $eq: ["$status", "suspended"] }, 1, 0],
            },
          },
          admins: {
            $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
          },
          bloggers: {
            $sum: { $cond: [{ $eq: ["$role", "blogger"] }, 1, 0] },
          },
          regularUsers: {
            $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        stats: userStats[0] || {
          total: 0,
          active: 0,
          inactive: 0,
          suspended: 0,
          admins: 0,
          bloggers: 0,
          regularUsers: 0,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Get users list error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users list",
      error: error.message,
    });
  }
};

// Update User Status
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (status && ["active", "inactive", "suspended"].includes(status)) {
      user.status = status;
    }

    if (role && ["user", "blogger", "admin"].includes(role)) {
      user.role = role;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// Get Admin Dashboard Overview - FIXED
export const getAdminOverview = async (req, res) => {
  try {
    // Get all statistics in parallel
    const [
      totalUsers,
      totalBlogs,
      publishedBlogs,
      pendingBlogs,
      todayUsers,
      todayBlogs,
      totalViews,
      totalLikes,
      categoriesCount,
    ] = await Promise.all([
      // Count all users
      User.countDocuments(),

      Blog.countDocuments({ isDeleted: false }),
      Blog.countDocuments({ status: "published", isDeleted: false }),
      Blog.countDocuments({ status: "pending", isDeleted: false }),

      // Today's all users
      User.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),

      Blog.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
        isDeleted: false,
      }),

      Blog.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]),
      Blog.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$likes" } } },
      ]),
      BlogCategory.countDocuments({ status: true }),
    ]);

    // Get latest blogs and users
    const [latestBlogs, latestUsers] = await Promise.all([
      Blog.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "username name email")
        .populate("category", "name")
        .select("title status views likes bookmarks user category createdAt"),

      // Get all users
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("username name email role createdAt status"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalBlogs,
          publishedBlogs,
          pendingBlogs,
          todayUsers,
          todayBlogs,
          totalViews: totalViews[0]?.total || 0,
          totalLikes: totalLikes[0]?.total || 0,
          categoriesCount,
        },
        latest: {
          blogs: latestBlogs,
          users: latestUsers.map((user) => ({
            ...user.toObject(),
            name: user.username || user.name || "Unknown",
          })),
        },
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin overview",
      error: error.message,
    });
  }
};

// Add this debug endpoint to your routes
export const debugAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find({});

    res.status(200).json({
      success: true,
      data: {
        totalCount: allUsers.length,
        users: allUsers.map((user) => ({
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          status: user.status,
          role: user.role,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
          isApproved: user.isApproved,
        })),
      },
    });
  } catch (error) {
    console.error("Debug all users error:", error);
    res.status(500).json({
      success: false,
      message: "Debug error",
      error: error.message,
    });
  }
};
