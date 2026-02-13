import express from "express";
import { body, validationResult } from "express-validator";
import { sendContactEmail } from "../services/Emailservice.js";
const router = express.Router();
// Validation middleware
const validateContactForm = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),

  body("contactType")
    .trim()
    .notEmpty()
    .withMessage("Inquiry type is required")
    .isIn([
      "general",
      "editorial",
      "advertising",
      "partnership",
      "technical",
      "other",
    ])
    .withMessage("Invalid inquiry type"),

  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 5 })
    .withMessage("Subject must be at least 5 characters"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 10 })
    .withMessage("Message must be at least 10 characters"),
];

// Contact form submission endpoint
router.post("/", validateContactForm, async (req, res) => {
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

    const { name, email, company, contactType, subject, message } = req.body;

    // Prepare contact data
    const contactData = {
      name,
      email,
      company: company || "",
      contactType,
      subject,
      message,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    };

    // Send emails
    await sendContactEmail(contactData);

    // Log contact submission (optional - could save to database)
    console.log("Contact form submitted:", {
      name,
      email,
      contactType,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Thank you for your message! We will get back to you soon.",
      data: {
        name,
        email,
        contactType,
        subject,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get contact info (for displaying in frontend)
router.get("/contact-info", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      email: process.env.ADMIN_EMAIL || "contact@blogify.com",
      phone: "+1 (555) 123-4567",
      address: "123 Business Avenue, New York, NY 10001",
      workingHours: "Monday-Friday, 9:00 AM - 6:00 PM EST",
      responseTime: "Typically within 24 hours",
      departments: [
        {
          name: "Editorial",
          email: "editorial@blogify.com",
          phone: "+1 (555) 123-4001",
        },
        {
          name: "Advertising",
          email: "ads@blogify.com",
          phone: "+1 (555) 123-4002",
        },
        {
          name: "Partnerships",
          email: "partnerships@blogify.com",
          phone: "+1 (555) 123-4003",
        },
        {
          name: "Technical Support",
          email: "support@blogify.com",
          phone: "+1 (555) 123-4004",
        },
      ],
    },
  });
});

export default router;
