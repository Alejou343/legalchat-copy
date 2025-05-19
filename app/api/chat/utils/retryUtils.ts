/**
 * Retry configuration for API calls
 */
export const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 32000, // 32 seconds
  backoffFactor: 2, // Exponential factor
  jitterFactor: 0.25, // Add some randomness to prevent thundering herd
};

/**
 * Sleep function for delay in retries
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate backoff delay with jitter
 */
export function calculateBackoffDelay(attempt: number): number {
  const baseDelay = Math.min(
    RETRY_CONFIG.maxDelayMs,
    RETRY_CONFIG.initialDelayMs * RETRY_CONFIG.backoffFactor ** attempt
  );

  // Add jitter to prevent all retries happening at the same time
  const jitter = RETRY_CONFIG.jitterFactor * baseDelay;
  return baseDelay + (Math.random() * 2 - 1) * jitter;
}

/**
 * Retry wrapper for API calls
 */
import logger from "@/lib/logger";

export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      logger.info(
        `Attempting ${operationName} (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
      );
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      const errorObj: any = error;
      const status =
        errorObj?.status || errorObj?.statusCode || errorObj?.response?.status;

      // Only retry on specific status codes that indicate temporary issues
      const retryableStatusCodes = [429, 500, 502, 503, 504, 529];
      const isRetryable = retryableStatusCodes.includes(status);

      if (!isRetryable) {
        logger.error(`Non-retryable error in ${operationName}:`, error);
        throw error;
      }

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        const delayMs = calculateBackoffDelay(attempt);
        logger.warn(
          `${operationName} failed with status ${status}. Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
      } else {
        logger.error(
          `${operationName} failed after ${RETRY_CONFIG.maxRetries} attempts:`,
          error
        );
      }
    }
  }

  throw lastError;
}