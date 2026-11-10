/** Returns a required environment variable, failing with a clear message when it is missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}
