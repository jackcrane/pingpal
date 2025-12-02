const requiredEnv = ["REDIS_URL", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = requiredEnv.filter(
    (key) => !process.env[key] || process.env[key].length === 0
  );
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};
