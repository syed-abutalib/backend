import express from "express";
import { body, validationResult } from "express-validator";
import { sendAdminNewSubscriberNotification, sendNewsletterWelcome } from "../services/Emailservice.js";
const router = express.Router();

// Mock database (replace with real database)
let subscribers = [];
const UNSUBSCRIBED_EMAILS = new Set();

// Validation middleware
const validateSubscription = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail()
    .custom((email) => {
      // Check if already subscribed
      if (subscribers.some((sub) => sub.email === email)) {
        throw new Error("Email is already subscribed");
      }
      // Check if unsubscribed
      if (UNSUBSCRIBED_EMAILS.has(email)) {
        throw new Error("This email has been unsubscribed");
      }
      return true;
    }),
];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "syedabutalib.dev@gmail.com";

// Newsletter subscription endpoint
router.post("/subscribe", validateSubscription, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        message: "Validation failed",
      });
    }

    const { email } = req.body;

    // Check if email exists in subscribers
    const existingSubscriber = subscribers.find((sub) => sub.email === email);
    if (existingSubscriber) {
      return res.status(200).json({
        success: true,
        message: "Email is already subscribed",
        data: { email },
      });
    }

    // Add to subscribers
    const newSubscriber = {
      email,
      subscribedAt: new Date().toISOString(),
      status: "active",
      source: req.get("Referer") || "direct",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    };

    subscribers.push(newSubscriber);

    // Send emails in parallel
    const emailPromises = [];

    // 1. Send welcome email to subscriber
    emailPromises.push(
      sendNewsletterWelcome(email).catch((error) => {
        console.error("Failed to send welcome email:", error);
        return { success: false, type: "welcome", error: error.message };
      }),
    );

    // 2. Send notification email to admin
    emailPromises.push(
      sendAdminNewSubscriberNotification({
        subscriberEmail: email,
        adminEmail: ADMIN_EMAIL,
        subscriberInfo: {
          subscribedAt: newSubscriber.subscribedAt,
          source: newSubscriber.source,
          ipAddress: newSubscriber.ipAddress,
          userAgent: newSubscriber.userAgent,
        },
      }).catch((error) => {
        console.error("Failed to send admin notification:", error);
        return { success: false, type: "admin", error: error.message };
      }),
    );

    // Wait for both emails to complete
    const emailResults = await Promise.allSettled(emailPromises);

    // Log email results
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Email ${index} failed:`, result.reason);
      }
    });

    // Log subscription
    console.log("New newsletter subscriber:", {
      email,
      timestamp: new Date().toISOString(),
      totalSubscribers: subscribers.length,
      welcomeEmailSent: emailResults[0]?.status === "fulfilled",
      adminEmailSent: emailResults[1]?.status === "fulfilled",
    });

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to newsletter!",
      data: {
        email,
        subscribedAt: newSubscriber.subscribedAt,
        message: "Check your email for a welcome message!",
        emailsSent: {
          welcome: emailResults[0]?.status === "fulfilled",
          notification: emailResults[1]?.status === "fulfilled",
        },
      },
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Unsubscribe endpoint
router.post(
  "/unsubscribe",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address"),
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Validation failed",
        });
      }

      const { email } = req.body;

      // Remove from subscribers
      subscribers = subscribers.filter((sub) => sub.email !== email);

      // Add to unsubscribed list
      UNSUBSCRIBED_EMAILS.add(email);

      // Log unsubscription
      console.log("Newsletter unsubscribe:", {
        email,
        timestamp: new Date().toISOString(),
        totalSubscribers: subscribers.length,
      });

      res.status(200).json({
        success: true,
        message: "Successfully unsubscribed from newsletter.",
        data: { email },
      });
    } catch (error) {
      console.error("Newsletter unsubscribe error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to unsubscribe. Please try again later.",
      });
    }
  },
);

// Get subscriber count (public endpoint)
router.get("/subscribers/count", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      total: subscribers.length,
      active: subscribers.filter((sub) => sub.status === "active").length,
      updatedAt: new Date().toISOString(),
    },
  });
});

// Get all subscribers (admin only - protected)
router.get("/subscribers", (req, res) => {
  // Add authentication middleware in production
  const { page = 1, limit = 50 } = req.query;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedSubscribers = subscribers.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: {
      subscribers: paginatedSubscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: subscribers.length,
        pages: Math.ceil(subscribers.length / limit),
      },
    },
  });
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Newsletter service is running",
    timestamp: new Date().toISOString(),
    stats: {
      totalSubscribers: subscribers.length,
      activeSubscribers: subscribers.filter((sub) => sub.status === "active")
        .length,
      unsubscribedCount: UNSUBSCRIBED_EMAILS.size,
    },
  });
});

export default router;
