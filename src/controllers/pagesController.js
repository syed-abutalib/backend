import Blog from "../models/Blog.js";
import BlogCategory from "../models/BlogCategory.js";

export const getHomePageData = async (req, res) => {
  try {
    // Fetch all data in parallel for maximum performance
    const [blogs, categories] = await Promise.all([
      // Fetch published blogs with user and category populated
      Blog.find({ 
        status: "published",
        isActive: true 
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
            as: "blogs"
          }
        },
        {
          $addFields: {
            blogCount: { $size: "$blogs" }
          }
        },
        {
          $project: {
            blogs: 0 // Remove blogs array from response
          }
        },
        {
          $sort: { blogCount: -1 }
        }
      ])
    ]);

    // Format blog helper function
    const formatBlog = (blog) => ({
      _id: blog._id,
      title: blog.title,
      description: blog.description,
      excerpt: blog.excerpt || blog.description?.substring(0, 150) + "...",
      slug: blog.slug,
      imageUrl: blog.imageUrl,
      views: blog.views || 0,
      likes: blog.likes || 0,
      isFeatured: blog.isFeatured || false,
      isHot: blog.isHot || false,
      isPopular: blog.isPopular || false,
      createdAt: blog.createdAt,
      user: blog.user ? {
        name: blog.user.name
      } : null,
      category: blog.category ? {
        _id: blog.category._id,
        name: blog.category.name,
        slug: blog.category.slug
      } : null
    });

    // Format all blogs
    const formattedBlogs = blogs.map(formatBlog);
    
    // ----- SMART TRENDING LOGIC -----
    let trendingPosts = [];
    
    // Check if we have enough blogs (minimum 10)
    if (formattedBlogs.length >= 10) {
      // Get blogs from last 30 days with views
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Try to get trending posts based on views/likes
      const potentialTrending = formattedBlogs
        .filter(blog => 
          new Date(blog.createdAt) >= thirtyDaysAgo && 
          (blog.views > 0 || blog.likes > 0)
        )
        .sort((a, b) => {
          // Score = views + (likes * 2) for weighted ranking
          const scoreA = (a.views || 0) + (a.likes || 0) * 2;
          const scoreB = (b.views || 0) + (b.likes || 0) * 2;
          return scoreB - scoreA;
        });
      
      if (potentialTrending.length >= 8) {
        // We have enough trending posts with engagement
        trendingPosts = potentialTrending.slice(0, 8);
      } else {
        // Mix trending + recent posts
        const trendingCount = potentialTrending.length;
        const recentNeeded = 8 - trendingCount;
        
        // Get recent posts (excluding already selected trending)
        const trendingIds = potentialTrending.map(p => p._id.toString());
        const recentPosts = formattedBlogs
          .filter(blog => !trendingIds.includes(blog._id.toString()))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, recentNeeded);
        
        trendingPosts = [...potentialTrending, ...recentPosts];
      }
    } else {
      // Not enough blogs overall, just show all recent posts
      trendingPosts = [...formattedBlogs]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, Math.min(8, formattedBlogs.length));
    }
    
    // ----- ROTATING POPULAR POSTS LOGIC -----
    let popularPosts = [];
    
    if (formattedBlogs.length >= 12) {
      // Get all posts sorted by views for popularity
      const allByViews = [...formattedBlogs]
        .sort((a, b) => (b.views || 0) - (a.views || 0));
      
      // Create rotation based on time
      const currentHour = new Date().getHours();
      const currentDate = new Date().getDate();
      
      // Use different rotation strategies based on time
      if (formattedBlogs.length >= 24) {
        // Enough for full rotation
        
        // Strategy 1: Hourly rotation (different every hour)
        const hourIndex = currentHour % 3; // 0, 1, or 2
        const startIndex = hourIndex * 8;
        popularPosts = allByViews.slice(startIndex, startIndex + 8);
        
        // If we don't have enough at that index, wrap around
        if (popularPosts.length < 8) {
          const remaining = 8 - popularPosts.length;
          popularPosts = [...popularPosts, ...allByViews.slice(0, remaining)];
        }
        
        // Mark as rotating for frontend
        popularPosts = popularPosts.map((post, index) => ({
          ...post,
          rotationType: 'hourly',
          rotationIndex: hourIndex,
          position: index + 1
        }));
        
      } else {
        // Strategy 2: Daily rotation (different every day)
        const dayIndex = currentDate % 2; // 0 or 1
        const startIndex = dayIndex * 8;
        popularPosts = allByViews.slice(startIndex, startIndex + 8);
        
        if (popularPosts.length < 8) {
          const remaining = 8 - popularPosts.length;
          popularPosts = [...popularPosts, ...allByViews.slice(0, remaining)];
        }
        
        popularPosts = popularPosts.map((post, index) => ({
          ...post,
          rotationType: 'daily',
          rotationIndex: dayIndex,
          position: index + 1
        }));
      }
    } else if (formattedBlogs.length >= 8) {
      // Not enough for full rotation, just show top 8 by views
      popularPosts = [...formattedBlogs]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 8)
        .map((post, index) => ({
          ...post,
          rotationType: 'static',
          position: index + 1
        }));
    } else {
      // Very few blogs, show all
      popularPosts = formattedBlogs.map((post, index) => ({
        ...post,
        rotationType: 'limited',
        position: index + 1
      }));
    }

    // Get featured posts
    const featuredPosts = formattedBlogs
      .filter(blog => blog.isFeatured)
      .slice(0, 3);
    
    // If no featured posts, get the latest 3
    const finalFeaturedPosts = featuredPosts.length > 0 
      ? featuredPosts 
      : formattedBlogs.slice(0, 3);

    // Get latest posts (always fresh)
    const latestPosts = formattedBlogs.slice(0, 8);

    // Get category posts for top 3 categories
    const topCategories = categories.slice(0, 3);
    
    // Fetch posts for each top category
    const categoryPostsPromises = topCategories.map(category =>
      Blog.find({
        status: "published",
        isActive: true,
        category: category._id
      })
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean()
    );

    const categoryPostsResults = await Promise.all(categoryPostsPromises);
    
    // Format category posts
    const categoryPosts = {};
    topCategories.forEach((category, index) => {
      categoryPosts[category.slug] = categoryPostsResults[index].map(formatBlog);
    });

    // Format categories with additional metadata
    const formattedCategories = categories.map(category => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      blogCount: category.blogCount || 0,
      image: category.image
    }));

    // Return combined response with rotation info
    return res.status(200).json({
      success: true,
      data: {
        featuredPosts: finalFeaturedPosts,
        trendingPosts: trendingPosts,
        latestPosts: latestPosts,
        popularPosts: popularPosts,
        categories: formattedCategories,
        categoryPosts: categoryPosts
      },
      meta: {
        totalBlogs: blogs.length,
        totalCategories: categories.length,
        timestamp: new Date().toISOString(),
        rotation: {
          popular: popularPosts[0]?.rotationType || 'none',
          hour: new Date().getHours(),
          day: new Date().getDate()
        }
      }
    });

  } catch (error) {
    console.error("Error fetching home page data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch home page data",
      error: error.message
    });
  }
};

// Optional: Get fresh data bypassing cache
export const getFreshHomePageData = async (req, res) => {
  try {
    // Add cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Call the main function
    return await getHomePageData(req, res);
  } catch (error) {
    console.error("Error fetching fresh home page data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fresh home page data",
      error: error.message
    });
  }
};