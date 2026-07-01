const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const authRoutes = require("./modules/authentication/auth.routes");

const app = express();

// 1. Request Logging Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// 2. Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. API Routes
app.use("/api/auth", authRoutes);

// 4. Base Diagnostic Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kamosharin Authentication API is running successfully!",
    timestamp: new Date().toISOString(),
  });
});

// 5. Swagger Endpoints
app.get("/api/swagger.json", (req, res) => {
  const swaggerPath = path.join(__dirname, "config/swagger.json");
  if (fs.existsSync(swaggerPath)) {
    const swaggerJson = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
    return res.status(200).json(swaggerJson);
  }
  res.status(404).json({
    success: false,
    message: "Swagger specification not found. Run 'npm run swagger' to generate it.",
  });
});

app.get("/api-docs", (req, res) => {
  const swaggerUiHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kamosharin API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" sizes="32x32" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; font-family: 'Inter', sans-serif; }
    .swagger-ui .topbar { background-color: #0f172a; border-bottom: 3px solid #3b82f6; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.standalonePreset
        ],
        layout: "BaseLayout"
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
  `;
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(swaggerUiHtml);
});

// 6. 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// 7. Global error handler middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error occurred",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

module.exports = app;
