#!/usr/bin/env node
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files
// Load .env first (highest priority), then .env.production (fallback)
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.production"), override: false });

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from dist directory
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all routes
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");

  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Build not found</h1>
      <p>Please run <code>npm run build</code> first to generate the dist folder.</p>
      <p>Looking for: ${indexPath}</p>
    `);
  }
});

// Start server
app.listen(PORT, () => {});
