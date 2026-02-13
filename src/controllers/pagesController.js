import Blog from "../models/Blog.js";
import BlogCategory from "../models/BlogCategory.js";

export const getHomePageData = async (req, res) => {
  try {
    // Fetch all data in parallel
    const [blogs, categories] = await Promise.all([
      // Fetch published blogs
      Blog.find({
        status: "published",
        isActive: true,
      })
        .populate("user", "name email")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),

      // Fetch categories with blog counts
      BlogCategory.aggregate([
        {
          $lookup: {
            from: "blogs",
            localField: "_id",
            foreignField: "category",
            as: "blogs",
          },
        },
        {
          $addFields: {
            blogCount: { $size: "$blogs" },
          },
        },
        {
          $project: {
            blogs: 0,
          },
        },
        {
          $sort: { blogCount: -1 },
        },
      ]),
    ]);

    // Format blog helper function
    const formatBlog = (blog) => ({
      _id: blog._id,
      title: blog.title,
      description: blog.description,
      excerpt:
        blog.excerpt ||
        (blog.description
          ? blog.description.substring(0, 150) + "..."
          : "No description available"),
      slug: blog.slug,
      imageUrl:
        blog.imageUrl ||
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop",
      views: blog.views || 0,
      likes: blog.likes || 0,
      isFeatured: blog.isFeatured || false,
      isHot: blog.isHot || false,
      isPopular: blog.isPopular || false,
      createdAt: blog.createdAt || new Date().toISOString(),
      user: blog.user
        ? {
            name: blog.user.name,
          }
        : { name: "Anonymous" },
      category: blog.category
        ? {
            _id: blog.category._id,
            name: blog.category.name,
            slug: blog.category.slug,
          }
        : { name: "Uncategorized", slug: "uncategorized" },
    });

    // Format all blogs
    const formattedBlogs = blogs.map(formatBlog);

    // ----- HANDLE EMPTY STATE -----
    const hasBlogs = formattedBlogs.length > 0;

    // ----- FEATURED POSTS -----
    let featuredPosts = [];
    if (hasBlogs) {
      featuredPosts = formattedBlogs
        .filter((blog) => blog.isFeatured)
        .slice(0, 3);

      // If no featured posts, get the latest 3
      if (featuredPosts.length === 0) {
        featuredPosts = formattedBlogs.slice(0, 3);
      }
    }

    // ----- TRENDING POSTS -----
    let trendingPosts = [];
    if (hasBlogs) {
      if (formattedBlogs.length >= 4) {
        // Get blogs from last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Try to get trending posts based on views/likes
        const potentialTrending = formattedBlogs
          .filter((blog) => new Date(blog.createdAt) >= thirtyDaysAgo)
          .sort((a, b) => {
            const scoreA = (a.views || 0) + (a.likes || 0) * 2;
            const scoreB = (b.views || 0) + (b.likes || 0) * 2;
            return scoreB - scoreA;
          });

        if (potentialTrending.length >= 4) {
          trendingPosts = potentialTrending.slice(0, 8);
        } else {
          // Mix with recent posts
          const trendingCount = potentialTrending.length;
          const recentNeeded = Math.min(
            8 - trendingCount,
            formattedBlogs.length - trendingCount,
          );

          const trendingIds = potentialTrending.map((p) => p._id.toString());
          const recentPosts = formattedBlogs
            .filter((blog) => !trendingIds.includes(blog._id.toString()))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, recentNeeded);

          trendingPosts = [...potentialTrending, ...recentPosts];
        }
      } else {
        // Not enough blogs, show all
        trendingPosts = formattedBlogs;
      }
    }

    // ----- LATEST POSTS -----
    let latestPosts = [];
    if (hasBlogs) {
      latestPosts = formattedBlogs.slice(0, 8);
    }

    // ----- POPULAR POSTS -----
    let popularPosts = [];
    if (hasBlogs) {
      if (formattedBlogs.length >= 4) {
        // Sort by views for popularity
        const allByViews = [...formattedBlogs].sort(
          (a, b) => (b.views || 0) - (a.views || 0),
        );

        // Simple rotation based on day
        const now = new Date();
        const dayOfMonth = now.getDate();
        const rotationOffset = dayOfMonth % Math.max(1, allByViews.length - 3);

        popularPosts = allByViews.slice(rotationOffset, rotationOffset + 4);

        if (popularPosts.length < 4) {
          const remaining = 4 - popularPosts.length;
          popularPosts = [...popularPosts, ...allByViews.slice(0, remaining)];
        }

        popularPosts = popularPosts.map((post, index) => ({
          ...post,
          position: index + 1,
        }));
      } else {
        popularPosts = formattedBlogs.map((post, index) => ({
          ...post,
          position: index + 1,
        }));
      }
    }

    // ----- CATEGORY POSTS -----
    const categoryPosts = {};
    const topCategories = categories.slice(0, 3);

    if (hasBlogs) {
      // Fetch posts for each top category
      const categoryPostsPromises = topCategories.map((category) =>
        Blog.find({
          status: "published",
          isActive: true,
          category: category._id,
        })
          .populate("category", "name slug")
          .sort({ createdAt: -1 })
          .limit(3)
          .lean(),
      );

      const categoryPostsResults = await Promise.all(categoryPostsPromises);

      topCategories.forEach((category, index) => {
        categoryPosts[category.slug] =
          categoryPostsResults[index].map(formatBlog);
      });
    } else {
      // Empty arrays for categories when no blogs
      topCategories.forEach((category) => {
        categoryPosts[category.slug] = [];
      });
    }

    // Format categories
    const formattedCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description || `Explore ${category.name} articles`,
      blogCount: category.blogCount || 0,
      image: category.image || null,
    }));

    // Return response
    return res.status(200).json({
      success: true,
      data: {
        featuredPosts,
        trendingPosts,
        latestPosts,
        popularPosts,
        categories: formattedCategories,
        categoryPosts,
      },
      meta: {
        totalBlogs: blogs.length,
        totalCategories: categories.length,
        hasContent: blogs.length > 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching home page data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch home page data",
      error: error.message,
    });
  }
};

// Optional: Get fresh data bypassing cache
export const getFreshHomePageData = async (req, res) => {
  try {
    // Add cache control headers
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    // Call the main function
    return await getHomePageData(req, res);
  } catch (error) {
    console.error("Error fetching fresh home page data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fresh home page data",
      error: error.message,
    });
  }
};
