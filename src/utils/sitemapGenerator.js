import { SitemapStream, streamToPromise } from "sitemap";
import fs from "fs";
import ftp from "basic-ftp";
import Blog from "../models/Blog.js";

export const generateAndUploadSitemap = async () => {
  try {
    console.log("Generating sitemap...");

    // Fetch fresh blogs from DB
    const blogs = await Blog.find().select("slug updatedAt");

    // Create sitemap stream
    const smStream = new SitemapStream({
      hostname: "https://dailyworldblog.com",
    });

    // Static pages
    smStream.write({ url: "/", priority: 1.0 });
    smStream.write({ url: "/blogs", priority: 0.9 });
    smStream.write({ url: "/about-us", priority: 0.9 });
    smStream.write({ url: "/contact-us", priority: 0.9 });

    // Category pages
    [
      "technology",
      "consulting",
      "home-and-garden",
      "fashion-and-beauty",
      "health-and-fitness",
      "finance",
      "games",
      "business",
    ].forEach((category) => {
      smStream.write({ url: `/category/${category}`, priority: 0.8 });
    });

    // Blog pages
    blogs.forEach((blog) => {
      smStream.write({
        url: `/blogs/${blog.slug}`,
        lastmod: blog.updatedAt,
        changefreq: "weekly",
        priority: 0.8,
      });
    });

    smStream.end();

    // Convert stream to XML
    const sitemap = await streamToPromise(smStream);
    const filePath = "./sitemap.xml";

    // Write sitemap locally
    fs.writeFileSync(filePath, sitemap.toString());

    // FTP upload
    const client = new ftp.Client();
    client.ftp.verbose = true; // logs FTP commands for debugging

    await client.access({
      host: process.env.FTP_HOST, // just hostname, no ftp://
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
    });

    // Delete old sitemap if exists
    try {
      await client.remove("/public_html/sitemap.xml");
      console.log("Old sitemap removed ✅");
    } catch (err) {
      console.log("No existing sitemap found, skipping delete");
    }

    // Upload new sitemap
    await client.uploadFrom(filePath, "/public_html/sitemap.xml");
    client.close();

    console.log("Sitemap uploaded successfully 🚀");
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }
};
