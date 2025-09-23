import { config } from 'dotenv';

// Ensure test environment
process.env.NODE_ENV = 'test';
// Provide required env defaults for tests if not present
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'super-secret-test-key-123456';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
process.env.REFRESH_JWT_SECRET =
  process.env.REFRESH_JWT_SECRET || 'super-refresh-secret-test-key-123456';
process.env.REFRESH_JWT_EXPIRES_IN = process.env.REFRESH_JWT_EXPIRES_IN || '7d';
process.env.TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYmNhZTQ4NmZhNzUyOGIyYmViZTI3OTViNWVjZWU5MyIsIm5iZiI6MTc1ODAwNTM5OS43Nzc5OTk5LCJzdWIiOiI2OGM5MDg5N2Q3Mjg0MWM3YjNkY2QxZTciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.wpTqN3g9Uhc4pYQiiEqEExL7zrJArSCefQSz-0tKUyU';
process.env.PORT = process.env.PORT || '0';

// Load test environment variables
config({ path: '.env.test' });
