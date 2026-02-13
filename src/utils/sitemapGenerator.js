import { SitemapStream, streamToPromise } from "sitemap";
import fs from "fs";
import ftp from "basic-ftp";
import Blog from "../models/Blog.js";

export const generateAndUploadSitemap = async () => {
  try {
    console.log("Generating sitemap...");

    const blogs = await Blog.find().select("slug updatedAt");

    const smStream = new SitemapStream({
      hostname: "https://dailyworldblog.com",
    });

    // Static pages
    smStream.write({ url: "/", priority: 1.0 });
    smStream.write({ url: "/blogs", priority: 0.9 });
    smStream.write({ url: "/about-us", priority: 0.9 });
    smStream.write({ url: "/contact-us", priority: 0.9 });

    // Category pages
    smStream.write({ url: "/category/technology", priority: 0.8 });
    smStream.write({ url: "/category/consulting", priority: 0.8 });
    smStream.write({ url: "/category/home-and-garden", priority: 0.8 });
    smStream.write({ url: "/category/fashion-and-beauty", priority: 0.8 });
    smStream.write({ url: "/category/health-and-fitness", priority: 0.8 });
    smStream.write({ url: "/category/finance", priority: 0.8 });
    smStream.write({ url: "/category/games", priority: 0.8 });
    smStream.write({ url: "/category/business", priority: 0.8 });

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

    const sitemap = await streamToPromise(smStream);
    const filePath = "./sitemap.xml";

    fs.writeFileSync(filePath, sitemap.toString());

    // FTP upload
    const client = new ftp.Client();
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
    });

    await client.uploadFrom(filePath, "/public_html/sitemap.xml");
    client.close();

    console.log("Sitemap uploaded successfully 🚀");
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }
};
    