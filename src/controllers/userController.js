// controllers/userController.js
import User from "../models/User.js";

// Get all users (with filters)
export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      status,
      isVerified,
      isApproved,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { username: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { fullName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Role filter
    if (role && ["admin", "user"].includes(role)) {
      query.role = role;
    }

    // Status filter
    if (status && ["active", "inactive", "suspended"].includes(status)) {
      query.status = status;
    }

    // Boolean filters
    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }
    if (isApproved !== undefined) {
      query.isApproved = isApproved === "true";
    }

    // Calculate pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get users with pagination
    const users = await User.find(query)
      .select("-password -refreshToken -__v")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await User.countDocuments(query);

    // Get stats
    const stats = {
      total: await User.countDocuments(),
      admin: await User.countDocuments({ role: "admin" }),
      user: await User.countDocuments({ role: "user" }),
      active: await User.countDocuments({ status: "active" }),
      inactive: await User.countDocuments({ status: "inactive" }),
      suspended: await User.countDocuments({ status: "suspended" }),
      verified: await User.countDocuments({ isVerified: true }),
      approved: await User.countDocuments({ isApproved: true }),
    };

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      stats,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -refreshToken -__v")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      email,
      role,
      status,
      bio,
      phone,
      fullName,
      gender,
      location,
      isVerified,
      isApproved,
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (username !== undefined) user.username = username;

    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email;
    }

    if (role && ["admin", "user"].includes(role)) {
      user.role = role;
    }

    if (status && ["active", "inactive", "suspended"].includes(status)) {
      user.status = status;
    }

    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;
    if (fullName !== undefined) user.fullName = fullName;
    if (gender !== undefined) user.gender = gender;
    if (location !== undefined) user.location = location;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (isApproved !== undefined) user.isApproved = isApproved;

    await user.save();

    // Return user without sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.__v;

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ❌ Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ❌ Prevent deleting the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the only admin account",
        });
      }
    }

    // ✅ HARD DELETE (PERMANENT)
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted permanently",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get user stats
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const adminUsers = await User.countDocuments({ role: "admin" });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const approvedUsers = await User.countDocuments({ isApproved: true });

    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        adminUsers,
        verifiedUsers,
        approvedUsers,
        newUsersThisMonth,
        userGrowth: userGrowth.reverse(),
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      role,
      status,
      phone,
      fullName,
      gender,
      location,
      isVerified,
      isApproved,
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    // Check if user already exists with email
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Check if username exists
    const existingUsernameUser = await User.findOne({ username });
    if (existingUsernameUser) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Create new user
    const user = new User({
      name: name || username,
      username,
      email,
      password,
      role: role || "user",
      status: status || "active",
      phone,
      fullName,
      gender,
      location,
      isVerified: isVerified || false,
      isApproved: isApproved !== undefined ? isApproved : true,
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.__v;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Toggle user verification status
export const toggleVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = !user.isVerified;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isVerified ? "verified" : "unverified"} successfully`,
      data: {
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Toggle verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Toggle user approval status
export const toggleApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isApproved = !user.isApproved;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isApproved ? "approved" : "unapproved"} successfully`,
      data: {
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error("Toggle approval error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
