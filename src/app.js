import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import BlogCategoryRoutes from "./routes/blogCategoryRoutes.js";
import Blog from "./routes/BlogRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import newsletterRoutes from "./routes/newsletter.js";
import contactRoutes from "./routes/contact.js";

import helmet from "helmet";
import morgan from "morgan";
const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.set("etag", false);

// Updated CORS
app.use(
  cors({
    origin: "*", // frontend domain
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // if you want cookies/auth
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("uploads"));

app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blog-categories", BlogCategoryRoutes);
app.use("/api/blogs", Blog);

app.use("/api/admin", adminDashboardRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/contact", contactRoutes);
app.use("/", (req, res) =>
  res.send(`
    <body><h1>Welcome to Blogging API</h1>
    </body>
    `),
);
export { app };
