/**
 * Environment variable validation
 *
 * Validates all required environment variables at import time.
 * Throws clear errors if validation fails in production.
 */

const isProduction = process.env.NODE_ENV === "production";

interface ValidatedEnv {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  NEXT_PUBLIC_APP_URL: string;
  SESSION_DURATION_DAYS: string;
  CRON_SECRET?: string;
}

function validateEnv(): ValidatedEnv {
  const errors: string[] = [];

  // Required: DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  }

  // Required: JWT_SECRET (with minimum length requirement in production)
  if (!process.env.JWT_SECRET) {
    errors.push("JWT_SECRET is required");
  } else if (isProduction && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters long in production");
  }

  // Warn about CRON_SECRET in production
  if (isProduction && !process.env.CRON_SECRET) {
    console.warn(
      "WARNING: CRON_SECRET is not set in production. Cron endpoints will be unprotected."
    );
  }

  // Throw if there are validation errors in production
  if (errors.length > 0) {
    const errorMessage = [
      "Environment validation failed:",
      ...errors.map((err) => `  - ${err}`),
      "",
      "Please set the required environment variables in your .env file.",
    ].join("\n");

    if (isProduction) {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
      console.error(
        "Continuing in development mode, but this will fail in production.\n"
      );
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100",
    SESSION_DURATION_DAYS: process.env.SESSION_DURATION_DAYS || "7",
    CRON_SECRET: process.env.CRON_SECRET,
  };
}

// Validate on import
export const env = validateEnv();
