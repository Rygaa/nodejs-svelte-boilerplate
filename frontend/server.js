import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;

// Serve static files from the dist directory with proper configuration
app.use(
  express.static(path.join(__dirname, "dist"), {
    maxAge: "1d", // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set proper content type for images
      if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      }
    },
  })
);

// Handle client-side routing - send all requests to index.html
// ONLY if it's not a file that exists in dist
app.get("*", (req, res, next) => {
  // Skip if it's a request for a static file
  if (req.path.match(/\.(jpg|jpeg|png|gif|svg|ico|js|css|json|woff|woff2|ttf|eot)$/)) {
    return next(); // Let express.static handle it or return 404
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📍 Server accessible at http://0.0.0.0:${PORT}`);
});
