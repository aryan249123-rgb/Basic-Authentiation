const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const emailUtil = require("../../utils/email");

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * @desc    Initialize user signup and generate OTP (Signup Flow)
 * @route   POST /api/auth/signup
 * @access  Public
 */
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate fields presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 2. Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // 3. Find if user exists
    let user = await User.findOne({ email });

    // Generate 6-digit OTP code as string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Expire in 5 minutes
    const otpExpireAt = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      // If email exists and verified = true, return error
      if (user.verified) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Add OTP resend/signup rate limiting using lastOtpSentAt
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (user.lastOtpSentAt && user.lastOtpSentAt > oneMinuteAgo) {
        const timeRemaining = Math.ceil((user.lastOtpSentAt.getTime() + 60 * 1000 - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${timeRemaining} seconds before requesting a new OTP.`,
        });
      }

      // If email exists and verified = false, update details and generate new OTP
      user.password = password; // pre-save hook handles hashing
      user.otp = otp;
      user.otpExpireAt = otpExpireAt;
      user.lastOtpSentAt = new Date();
      await user.save();

      console.log(`[Signup OTP Resend] Generated code ${otp} for pending user: ${email}`);
    } else {
      // If email does not exist, create a new user (verified = false)
      user = new User({
        email,
        password, // pre-save hook handles hashing
        otp,
        otpExpireAt,
        verified: false,
        lastOtpSentAt: new Date(),
      });
      await user.save();

      console.log(`[Signup OTP New] Generated code ${otp} for new user: ${email}`);
    }

    // 5. Send the OTP email using Nodemailer only after db operation succeeds
    try {
      await emailUtil.sendOtp(email, otp);
    } catch (emailError) {
      console.error(`[Email Delivery Failure] Failed to send OTP to ${email}: ${emailError.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
      });
    }

    // Return response without OTP for production security
    res.status(200).json({
      success: true,
      message: "Verification OTP generated successfully",
    });
  } catch (error) {
    console.error(`[Signup OTP Gen Error] ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Server error occurred during signup initialization",
      error: error.message,
    });
  }
};

/**
 * @desc    Send and store OTP (compatibility route, calls signup logic)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
exports.sendOtp = exports.signup;

/**
 * @desc    Verify OTP and complete signup registration
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. Validate fields presence
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and OTP code",
      });
    }

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Signup details not found or expired. Please request a new OTP by submitting email/password again.",
      });
    }

    // 3. Verify OTP matches and has not expired
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    if (!user.otpExpireAt || user.otpExpireAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // 4. Set user as verified and clear OTP fields
    user.verified = true;
    user.otp = undefined;
    user.otpExpireAt = undefined;
    await user.save();

    // 5. Send response
    res.status(201).json({
      success: true,
      message: "User registered and verified successfully",
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error(`[Verify OTP Error] ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Server error occurred during signup verification",
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/signin
 * @access  Public
 */
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate fields presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 2. Find user and explicitly select password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Ensure the user is verified before allowing signin
    if (!user.verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email address before signing in",
      });
    }

    // 4. Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 5. Generate JWT
    const token = generateToken(user._id);

    // 6. Send response
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error(`[Signin Error] ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Server error occurred during signin",
      error: error.message,
    });
  }
};
