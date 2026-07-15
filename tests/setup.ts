import crypto from "crypto";

// Generate a test encryption key (32 bytes = AES-256)
const testKey = crypto.randomBytes(32).toString("base64");
process.env.ENCRYPTION_KEY = testKey;
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
