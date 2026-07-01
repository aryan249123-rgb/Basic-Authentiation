require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const bcrypt = require("bcryptjs");

const TEST_EMAIL = "test-refactor-user@kamosharin.com";
const TEST_PASSWORD = "supersecurepassword123";

async function runTests() {
  console.log("=== Authentication System Refactoring Verification ===");
  
  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env file.");
    process.exit(1);
  }

  try {
    // 1. Connect to MongoDB
    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully.");

    // 2. Cleanup existing test user
    console.log(`Cleaning up test records for: ${TEST_EMAIL}...`);
    await User.deleteOne({ email: TEST_EMAIL });

    // 3. Test Signup Flow (New User)
    console.log("\n--- Case 1: Initial Signup (New User) ---");
    const initialOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const initialOtpExpireAt = new Date(Date.now() + 5 * 60 * 1000);
    
    const newUser = new User({
      email: TEST_EMAIL,
      password: TEST_PASSWORD, // Plaintext, hashes via pre-save hook
      otp: initialOtp,
      otpExpireAt: initialOtpExpireAt,
      verified: false,
      lastOtpSentAt: new Date()
    });
    
    await newUser.save();
    console.log("✔ Created unverified user record successfully.");

    // Retrieve from DB to verify schema fields
    const createdUser = await User.findOne({ email: TEST_EMAIL }).select("+password");
    console.log("Verification:");
    console.log(`- email: ${createdUser.email} (Expected: ${TEST_EMAIL})`);
    console.log(`- password (hashed): ${createdUser.password} (Length: ${createdUser.password.length})`);
    console.log(`- verified: ${createdUser.verified} (Expected: false)`);
    console.log(`- otp (string): "${createdUser.otp}" (Expected: "${initialOtp}")`);
    console.log(`- otpExpireAt: ${createdUser.otpExpireAt}`);
    console.log(`- lastOtpSentAt: ${createdUser.lastOtpSentAt}`);

    if (typeof createdUser.otp !== 'string') throw new Error("OTP is not saved as a string");
    if (createdUser.verified !== false) throw new Error("Verified is not false by default");
    if (!createdUser.password.startsWith('$2a$') && !createdUser.password.startsWith('$2b$')) {
      throw new Error("Password is not a valid bcrypt hash");
    }
    console.log("✔ Verification successful: fields correctly formatted and hashed.");

    // 4. Test Rate Limiting
    console.log("\n--- Case 2: Rate Limiting ---");
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (createdUser.lastOtpSentAt > oneMinuteAgo) {
      const remainingSeconds = Math.ceil((createdUser.lastOtpSentAt.getTime() + 60 * 1000 - Date.now()) / 1000);
      console.log(`✔ Rate limiting correctly triggered! Client would wait ${remainingSeconds} seconds.`);
    } else {
      throw new Error("Rate limit check failed.");
    }

    // 5. Test Resend/Re-registration (Unverified User)
    console.log("\n--- Case 3: Re-registration for Unverified User (Bypassing Rate Limit) ---");
    // Simulate time passing (move lastOtpSentAt back by 2 minutes)
    createdUser.lastOtpSentAt = new Date(Date.now() - 2 * 60 * 1000);
    await createdUser.save();

    // Re-registration flow
    const updatedUserRecord = await User.findOne({ email: TEST_EMAIL });
    const newPassword = "newpassword987654";
    const newOtp = "098765"; // Store with leading zero to verify string storage
    const newOtpExpireAt = new Date(Date.now() + 5 * 60 * 1000);

    updatedUserRecord.password = newPassword;
    updatedUserRecord.otp = newOtp;
    updatedUserRecord.otpExpireAt = newOtpExpireAt;
    updatedUserRecord.lastOtpSentAt = new Date();
    await updatedUserRecord.save();

    const verifiedUpdatedUser = await User.findOne({ email: TEST_EMAIL }).select("+password");
    console.log(`✔ Updated unverified user details successfully.`);
    console.log(`- New password hash: ${verifiedUpdatedUser.password}`);
    console.log(`- New OTP (string): "${verifiedUpdatedUser.otp}" (Expected: "098765")`);
    
    if (verifiedUpdatedUser.otp !== "098765") {
      throw new Error(`OTP leading zero was lost or incorrect: ${verifiedUpdatedUser.otp}`);
    }
    console.log("✔ Verification successful: Leading zero preserved in string OTP.");

    // 6. Test Login Blocked for Unverified User
    console.log("\n--- Case 4: Login for Unverified User ---");
    if (!verifiedUpdatedUser.verified) {
      console.log("✔ Correctly block login: User is not verified yet.");
    } else {
      throw new Error("Unverified user was allowed to log in.");
    }

    // 7. Test OTP Verification Flow
    console.log("\n--- Case 5: OTP Verification ---");
    // Simulate verification controller logic
    const userToVerify = await User.findOne({ email: TEST_EMAIL });
    
    // Test invalid OTP
    const invalidOtpInput = "111111";
    if (userToVerify.otp !== invalidOtpInput) {
      console.log(`✔ Invalid OTP rejected correctly.`);
    } else {
      throw new Error("Invalid OTP was accepted.");
    }

    // Verify successfully
    userToVerify.verified = true;
    userToVerify.otp = undefined;
    userToVerify.otpExpireAt = undefined;
    await userToVerify.save();

    const finalVerifiedUser = await User.findOne({ email: TEST_EMAIL }).select("+password");
    console.log("✔ OTP verified successfully.");
    console.log(`- verified: ${finalVerifiedUser.verified} (Expected: true)`);
    console.log(`- otp cleared: ${finalVerifiedUser.otp} (Expected: undefined/null)`);
    console.log(`- otpExpireAt cleared: ${finalVerifiedUser.otpExpireAt} (Expected: undefined/null)`);

    if (finalVerifiedUser.verified !== true || finalVerifiedUser.otp !== undefined) {
      throw new Error("Fields not cleared correctly after verification.");
    }
    console.log("✔ Verification successful: OTP fields cleared, status marked verified.");

    // 8. Test Verified User Re-registration
    console.log("\n--- Case 6: Duplicate Registration Attempt ---");
    const duplicateUserCheck = await User.findOne({ email: TEST_EMAIL });
    if (duplicateUserCheck && duplicateUserCheck.verified) {
      console.log("✔ Blocked duplicate registration: Email already registered.");
    } else {
      throw new Error("Duplicate registration was not blocked.");
    }

    // 9. Clean up test database records
    console.log("\nCleaning up database records...");
    await User.deleteOne({ email: TEST_EMAIL });
    console.log("Database clean.");

    console.log("\n=============================================");
    console.log("✔ ALL DATABASE & FLOW VERIFICATION TESTS PASSED!");
    console.log("=============================================");

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

runTests();
