import jwt from "jsonwebtoken";
import User from "../models/User.js";
export const AuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select("-password");
    if (!req.user) return res.status(404).json({ message: "User not found" });
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
export const AdminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = (req.user = await User.findById(decoded.userId).select(
      "-password",
    ));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied, admin only" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
