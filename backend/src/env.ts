import dotenv from "dotenv";
import path from "path";

// Explicitly load backend/.env — NOT the root .env
// This must be imported FIRST in index.ts before any other imports that might use env vars
console.log("Loading environment variables from:", path.resolve(__dirname, "../.env"));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
