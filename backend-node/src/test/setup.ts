// Runs before every test file. `auth/jwt.ts` throws at import time if
// JWT_SECRET is missing (deliberately, to fail fast rather than run with a
// silent default secret) — so tests need one set before anything imports it.
process.env['JWT_SECRET'] ??= 'test-only-secret-do-not-use-in-real-deployments';
