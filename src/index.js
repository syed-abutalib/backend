import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import cron from "node-cron";
import { generateAndUploadSitemap } from "./utils/sitemapGenerator.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(PORT, async () => {
      console.log(`✅ Server is running on port ${PORT}`);
      await generateAndUploadSitemap();

      // Run every 6 hours
      cron.schedule("0 */6 * * *", async () => {
        console.log("Running sitemap cron job...");
        await generateAndUploadSitemap();
      });
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database", error);
  });
