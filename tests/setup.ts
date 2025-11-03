import { config } from "dotenv";

// Load environment variables for tests
config();

// Use Node's native fetch (available in Node 18+)
// No need to polyfill - Jest will use the native implementation
