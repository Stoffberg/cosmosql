import { config } from "dotenv";

// Load environment variables for tests
config();

// Mock fetch globally for all tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
