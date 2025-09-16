import { config } from 'dotenv';

// Ensure test environment
process.env.NODE_ENV = 'test';

// Load test environment variables
config({ path: '.env.test' });
