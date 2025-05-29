import logger from "@/lib/logger";

/**
 * Configuration object for controlling retry behavior in API operations.
 *
 * @property {number} maxRetries - Maximum number of retry attempts.
 * @property {number} initialDelayMs - Initial delay in milliseconds before the first retry.
 * @property {number} maxDelayMs - Maximum allowed delay between retries in milliseconds.
 * @property {number} backoffFactor - Multiplier for exponential backoff calculation.
 * @property {number} jitterFactor - Random jitter factor to reduce retry collisions.
 */

export const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 32000, // 32 seconds
  backoffFactor: 2, // Exponential factor
  jitterFactor: 0.25, // Add some randomness to prevent thundering herd
};

/**
 * Utility function that pauses execution for a specified duration.
 *
 * @param {number} ms - Time in milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 *
 * @example
 * await sleep(2000); // Waits for 2 seconds
 */

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates the delay duration for a retry attempt using exponential backoff and jitter.
 *
 * @param {number} attempt - The current retry attempt number (starting from 0).
 * @returns {number} The computed delay in milliseconds.
 *
 * @example
 * const delay = calculateBackoffDelay(2); // Returns delay for third attempt
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
 * Executes an asynchronous operation with automatic retries for retryable errors.
 *
 * @template T
 * @param {() => Promise<T>} operation - The async operation to retry.
 * @param {string} operationName - A descriptive name for logging purposes.
 * @returns {Promise<T>} The result of the successful operation.
 * @throws {unknown} If all retry attempts fail or a non-retryable error occurs.
 *
 * @example
 * const result = await withRetry(() => fetchData(), 'FetchData');
 */


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