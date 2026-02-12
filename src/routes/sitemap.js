// routes/sitemap.js
import express from "express";
import Blog from "../models/Blog.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const blogs = await Blog.find({ isDeleted: false }).select(
      "slug updatedAt",
    );

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://dailyworldblog.com"
        : "http://localhost:5173";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    xml += `
      <url>
        <loc>${baseUrl}</loc>
      <lastmod>2026-02-11T18:30:00+00:00</lastmod>
      <changefreq>weekly</changefreq>
        <priority>1.00</priority>
        </url>
      <url>
        <loc>${baseUrl}/blogs</loc>
     <lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>weekly</changefreq>
<priority>1.00</priority>
        </url>
      <url>
        <loc>${baseUrl}/about-us</loc>
      <lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>weekly</changefreq>
<priority>1.00</priority>
        </url>
      <url>
        <loc>${baseUrl}/contact-us</loc>
      <lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>weekly</changefreq>
<priority>1.00</priority>
        </url>
      <url>
<loc>https://dailyworldblog.com/category/business</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/technology</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/consulting</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/home-and-garden</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/fashion-and-beauty</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/health-and-fitness</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/finance</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
<url>
<loc>https://dailyworldblog.com/category/games</loc>
<lastmod>2026-02-11T18:30:00+00:00</lastmod>
<changefreq>daily</changefreq>
<priority>0.80</priority>
</url>
    `;

    // Dynamic blog pages
    blogs.forEach((blog) => {
      xml += `
        <url>
          <loc>${baseUrl}/blogs/${blog.slug}</loc>
          <lastmod>${blog.updatedAt.toISOString()}</lastmod>
        </url>
      `;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
