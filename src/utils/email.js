const nodemailer = require("nodemailer");

// Configure a Nodemailer transporter using Gmail and environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Google App Password
  },
});

/**
 * Reusable utility function to send OTP email
 * @param {string} email - Recipient's email address
 * @param {string} otp - The 6-digit OTP code
 * @returns {Promise<any>}
 */
const sendOtp = async (email, otp) => {
  const mailOptions = {
    from: `"Kamosharin Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #3b82f6; text-align: center;">Kamosharin Verification</h2>
        <p>Hello,</p>
        <p>Thank you for registering. Please use the following One-Time Password (OTP) to complete your email verification:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937; margin: 20px 0; border-radius: 6px;">
          ${otp}
        </div>
        <p style="color: #dc2626; font-weight: 500;">Please note that this OTP will expire in 5 minutes.</p>
        <p>If you did not request this verification, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated security email. Please do not reply.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendOtp,
};
