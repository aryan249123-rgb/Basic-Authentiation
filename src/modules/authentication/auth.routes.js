const express = require("express");
const { signup, signin, sendOtp, verifyOtp } = require("./auth.controller");

const router = express.Router();

/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     summary: Request and store a 6-digit OTP code (Compatibility Endpoint)
 *     description: Runs the signup initiation flow. Generates a 6-digit OTP string, stores it in the User document, and returns it. Rate-limited to once per minute.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email to sign up
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: The password for the user (minimum 6 characters long)
 *                 example: securepassword123
 *     responses:
 *       200:
 *         description: OTP generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification OTP generated successfully
 *                 otp:
 *                   type: string
 *                   example: "123456"
 *       400:
 *         description: Missing fields, password too short, or email already registered
 *       429:
 *         description: Rate limited (more than once per minute)
 *       500:
 *         description: Server error
 */
router.post("/send-otp", sendOtp);

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Initialize user signup and generate OTP
 *     description: If the email does not exist, creates an unverified user and generates a 6-digit OTP. If the email exists and is unverified, updates the password, generates a new OTP, and updates the rate limit timestamp. If the email is already verified, returns an error. Rate-limited to once per minute for existing unverified users.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignupInput'
 *     responses:
 *       200:
 *         description: OTP generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification OTP generated successfully
 *                 otp:
 *                   type: string
 *                   example: "123456"
 *       400:
 *         description: Invalid fields, password too short, or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email already registered
 *       429:
 *         description: Rate limited (more than once per minute)
 *       500:
 *         description: Server error
 */
router.post("/signup", signup);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and complete registration
 *     description: Verifies the 6-digit OTP code against the User document. If correct, sets verified = true and clears the OTP fields.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email to complete signup for
 *                 example: jane@example.com
 *               otp:
 *                 type: string
 *                 description: The 6-digit OTP code
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: User verified and registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered and verified successfully
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid or expired OTP code, or email details not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid OTP code
 *       500:
 *         description: Server error
 */
router.post("/verify-otp", verifyOtp);

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     summary: Authenticate user and get token
 *     description: Validates email and password, checks that the user is verified, generates a signed JWT, and returns it.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSigninInput'
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged in successfully
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid credentials or unverified email
 *       500:
 *         description: Server error
 */
router.post("/signin", signin);

module.exports = router;
