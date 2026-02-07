import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to take messages");
  }
});

// Contact form email template
const contactEmailTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .details {
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #475569;
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .value {
          color: #1e293b;
          font-size: 16px;
        }
        .message-box {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #3b82f6;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          border-top: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #3b82f6;
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📬 New Contact Form Submission</h1>
          <p>A user has submitted the contact form</p>
        </div>
        
        <div class="content">
          <div class="details">
            <div class="detail-row">
              <span class="label">From</span>
              <span class="value">${data.name} (${data.email})</span>
            </div>
            
            ${
              data.company
                ? `
            <div class="detail-row">
              <span class="label">Company</span>
              <span class="value">${data.company}</span>
            </div>
            `
                : ""
            }
            
            <div class="detail-row">
              <span class="label">Inquiry Type</span>
              <span class="value">
                ${data.contactType}
                <span class="badge">${data.contactType.toUpperCase()}</span>
              </span>
            </div>
            
            <div class="detail-row">
              <span class="label">Subject</span>
              <span class="value">${data.subject}</span>
            </div>
          </div>
          
          <div class="message-box">
            <div class="label">Message</div>
            <div class="value">${data.message.replace(/\n/g, "<br>")}</div>
          </div>
          
          <div style="color: #64748b; font-size: 14px; text-align: center; padding: 20px 0;">
            <p>📅 Submitted on: ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This message was sent from the contact form on Daily World Blog.</p>
          <p>© ${new Date().getFullYear()} Daily World Blog. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Auto-reply email template
const autoReplyTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Us</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .content {
          padding: 40px;
        }
        .icon {
          text-align: center;
          margin-bottom: 30px;
        }
        .icon span {
          display: inline-block;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          border-radius: 50%;
          line-height: 80px;
          font-size: 36px;
          color: white;
        }
        .message {
          text-align: center;
          margin-bottom: 30px;
        }
        .message h2 {
          color: #1e293b;
          margin-bottom: 15px;
        }
        .message p {
          color: #64748b;
          font-size: 16px;
        }
        .next-steps {
          background: #f8fafc;
          border-radius: 8px;
          padding: 25px;
          margin: 30px 0;
        }
        .next-steps h3 {
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .step {
          display: flex;
          align-items: flex-start;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .step:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .step-number {
          background: #3b82f6;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .step-content h4 {
          margin: 0 0 5px 0;
          color: #1e293b;
        }
        .step-content p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        .response-time {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          color: white;
          border-radius: 8px;
          margin: 30px 0;
        }
        .response-time h3 {
          margin: 0 0 10px 0;
          font-size: 20px;
        }
        .response-time p {
          margin: 0;
          opacity: 0.9;
        }
        .contact-info {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .contact-info p {
          margin: 5px 0;
          color: #475569;
        }
        .footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Contacting Us! 🎉</h1>
        </div>
        
        <div class="content">
          <div class="icon">
            <span>✓</span>
          </div>
          
          <div class="message">
            <h2>Hello ${name},</h2>
            <p>We've received your message and our team will get back to you shortly.</p>
          </div>
          
          <div class="next-steps">
            <h3>What happens next?</h3>
            
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Review by Our Team</h4>
                <p>Your inquiry has been forwarded to the relevant department.</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Personalized Response</h4>
                <p>A specialist will review your inquiry and prepare a detailed response.</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Resolution</h4>
                <p>We'll work with you to address your inquiry completely.</p>
              </div>
            </div>
          </div>
          
          <div class="response-time">
            <h3>⏰ Response Time</h3>
            <p>We typically respond within 24 hours during business days.</p>
          </div>
          
          <div class="contact-info">
            <p><strong>Need immediate assistance?</strong></p>
            <p>Email: info@dailyworldblog.com</p>
          </div>
          
          <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
            <p>📅 This is an automated response. Please do not reply to this email.</p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Best regards,</strong></p>
          <p>The Daily World Blog Team</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} Daily World Blog. All rights reserved.</p>
          <p style="font-size: 12px; margin-top: 10px;">
            This email was sent in response to your contact form submission.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Newsletter welcome email template
const newsletterWelcomeTemplate = (email) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Newsletter! 📰</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .content {
          padding: 40px;
        }
        .welcome-message {
          text-align: center;
          margin-bottom: 30px;
        }
        .welcome-message h2 {
          color: #1e293b;
          margin-bottom: 15px;
        }
        .welcome-message p {
          color: #64748b;
          font-size: 16px;
        }
        .benefits {
          background: #f8fafc;
          border-radius: 8px;
          padding: 25px;
          margin: 30px 0;
        }
        .benefits h3 {
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 20px;
          text-align: center;
        }
        .benefit-item {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .benefit-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .benefit-icon {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .benefit-content h4 {
          margin: 0 0 5px 0;
          color: #1e293b;
        }
        .benefit-content p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }
        .next-issue {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #000000 100%);
          color: white;
          border-radius: 8px;
          margin: 30px 0;
        }
        .next-issue h3 {
          margin: 0 0 10px 0;
          font-size: 20px;
        }
        .next-issue p {
          margin: 0;
          opacity: 0.9;
        }
        .unsubscribe {
          text-align: center;
          color: #64748b;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Our Newsletter! 🎉</h1>
          <p>You're now part of our exclusive community</p>
        </div>
        
        <div class="content">
          <div class="welcome-message">
            <h2>Welcome Aboard! 👋</h2>
            <p>Thank you for subscribing to the Daily World Blog newsletter. You've just unlocked access to premium content and insights.</p>
          </div>
          
          <div class="benefits">
            <h3>🎁 What You'll Receive</h3>
            
            <div class="benefit-item">
              <div class="benefit-icon">📰</div>
              <div class="benefit-content">
                <h4>Weekly Digest</h4>
                <p>Curated selection of top articles every Monday</p>
              </div>
            </div>
            
            <div class="benefit-item">
              <div class="benefit-icon">🚀</div>
              <div class="benefit-content">
                <h4>Exclusive Content</h4>
                <p>Early access to new features and premium articles</p>
              </div>
            </div>
            
            <div class="benefit-item">
              <div class="benefit-icon">🎯</div>
              <div class="benefit-content">
                <h4>Industry Insights</h4>
                <p>Expert analysis and trending topics in your inbox</p>
              </div>
            </div>
            
            <div class="benefit-item">
              <div class="benefit-icon">💎</div>
              <div class="benefit-content">
                <h4>Special Offers</h4>
                <p>Discounts and promotions for subscribers only</p>
              </div>
            </div>
          </div>
          
          <div class="next-issue">
            <h3>📅 Next Issue Arrives</h3>
            <p>Your first newsletter will arrive in your inbox within 24 hours</p>
          </div>
          
          <div class="unsubscribe">
            <p>If you wish to unsubscribe at any time, simply click the link at the bottom of any newsletter email.</p>
            <p><small>You subscribed with: ${email}</small></p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Happy Reading! 📚</strong></p>
          <p>The Daily World Editorial Team</p>
          <p style="margin-top: 20px;">© ${new Date().getFullYear()} Daily World Blog. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send contact form email
const sendContactEmail = async (contactData) => {
  try {
    // Send to admin
    const adminMail = {
      from: `"Daily World Blog Contact" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `New Contact Form: ${contactData.subject}`,
      html: contactEmailTemplate(contactData),
    };

    // Send auto-reply to user
    const userMail = {
      from: `"Daily World Blog Support" <${process.env.SMTP_USER}>`,
      to: contactData.email,
      subject: "Thank You for Contacting Daily World Blog!",
      html: autoReplyTemplate(contactData.name),
    };

    // Send both emails
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    return { success: true, message: "Emails sent successfully" };
  } catch (error) {
    console.error("Error sending contact email:", error);
    throw new Error("Failed to send email");
  }
};

// Send newsletter welcome email
const sendNewsletterWelcome = async (email) => {
  try {
    const mailOptions = {
      from: `"Daily World Blog Newsletter" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to Daily World Blog Newsletter! 🎉",
      html: newsletterWelcomeTemplate(email),
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "Welcome email sent" };
  } catch (error) {
    console.error("Error sending newsletter welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};
const sendAdminNewSubscriberNotification = async ({
  subscriberEmail,
  adminEmail,
  subscriberInfo,
}) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"info@dailyworldblog.com"',
      to: adminEmail,
      subject: "🎉 New Newsletter Subscriber!",
      html: `
        <h2>New Newsletter Subscription</h2>
        <p>A new user has subscribed to your newsletter!</p>
        
        <h3>Subscriber Details:</h3>
        <ul>
          <li><strong>Email:</strong> ${subscriberEmail}</li>
          <li><strong>Subscription Date:</strong> ${subscriberInfo.subscribedAt}</li>
          <li><strong>Source:</strong> ${subscriberInfo.source}</li>
          <li><strong>IP Address:</strong> ${subscriberInfo.ipAddress}</li>
          <li><strong>User Agent:</strong> ${subscriberInfo.userAgent}</li>
        </ul>
        
        <h3>Quick Stats:</h3>
        <p>Total subscribers now: ${subscriberInfo.totalSubscribers || "N/A"}</p>
        
        <hr>
        <p><small>This is an automated notification from your newsletter system.</small></p>
      `,
      text: `
        New Newsletter Subscription
        
        A new user has subscribed to your newsletter!
        
        Subscriber Details:
        - Email: ${subscriberEmail}
        - Subscription Date: ${subscriberInfo.subscribedAt}
        - Source: ${subscriberInfo.source}
        - IP Address: ${subscriberInfo.ipAddress}
        - User Agent: ${subscriberInfo.userAgent}
        
        This is an automated notification from your newsletter system.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Admin notification sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    throw error;
  }
};

export {
  sendContactEmail,
  sendNewsletterWelcome,
  sendAdminNewSubscriberNotification,
};
