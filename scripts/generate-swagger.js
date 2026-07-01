const swaggerJSDoc = require("swagger-jsdoc");
const fs = require("fs");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kamosharin Authentication API",
      version: "1.0.0",
      description: "Simple authentication API with signup and signin features, built with Express, MongoDB, and deployed serverless on Vercel.",
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Local development server",
      },
      {
        url: "https://kamosharin-backend.vercel.app",
        description: "Vercel production server (Serverless)",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token to access protected routes",
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // Paths to files containing annotations
  apis: [
    path.join(__dirname, "../src/models/*.js").replace(/\\/g, "/"),
    path.join(__dirname, "../src/modules/**/*.js").replace(/\\/g, "/"),
    path.join(__dirname, "../src/app.js").replace(/\\/g, "/"),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

const outputPath = path.join(__dirname, "../src/config/swagger.json");

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), "utf8");
console.log(`[Swagger] Compiled successfully! Schema written to: ${outputPath}`);
