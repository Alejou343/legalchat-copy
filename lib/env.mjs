import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import "dotenv/config";

/**
 * Environment configuration using @t3-oss/env-nextjs and Zod for type-safe validation.
 *
 * Server Environment Variables:
 * - NODE_ENV: Specifies the environment mode of the server. Allowed values are:
 *   "development", "test", or "production". Defaults to "development".
 * - DATABASE_URL: Connection string for the database. Must be a non-empty string.
 *
 * Client Environment Variables:
 * - (Currently empty, but you can add variables starting with NEXT_PUBLIC_ here for client-side usage)
 *
 * Notes:
 * - The 'experimental__runtimeEnv' section is for providing runtime environment variables
 *   for Next.js versions 13.4.4 or higher. It allows you to specify which environment
 *   variables should be available at runtime.
 * - For Next.js versions earlier than 13.4.4, use the commented-out 'runtimeEnv' block instead.
 *
 * Usage:
 * Import the exported `env` object to access validated environment variables
 * with full type safety in your server or client code.
 */

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    
  },
  client: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  },
});
