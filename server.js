// 1. Load environment variables
require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

// 2. Set Server Port
const PORT = process.env.PORT || 5000;

// 3. Connect to Database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(
        `[Server] Active in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
      console.log(`[Diagnostic] Base path: http://localhost:${PORT}`);
    });

    // Handle system-wide unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error(`[Fatal Error] Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`[Fatal Error] Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();
