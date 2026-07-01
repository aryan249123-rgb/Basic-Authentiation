const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * @openapi
 * components:
 *   schemas:
 *     UserSignupInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: The unique email of the user
 *           example: jane@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: The password of the user (minimum 6 characters long)
 *           example: securepassword123
 *     UserSigninInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address
 *           example: jane@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: The user's password
 *           example: securepassword123
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated Mongoose MongoDB ID of the user
 *           example: 6474df6f157b8a001fb17345
 *         email:
 *           type: string
 *           format: email
 *           description: The email of the user
 *           example: jane@example.com
 *         verified:
 *           type: boolean
 *           description: Whether the user's email has been verified
 *           example: true
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Ensures we don't accidentally return password in queries
    },
    otp: {
      type: String,
      trim: true,
    },
    otpExpireAt: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    lastOtpSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving a new or modified user document
userSchema.pre("save", async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to check if the entered password matches the stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
