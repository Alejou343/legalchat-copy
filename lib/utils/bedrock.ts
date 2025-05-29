/**
 * Amazon Bedrock client instance configured for region 'us-east-1'
 * using the default Node.js AWS credential provider chain.
 *
 * @module lib/bedrock
 */

import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

/**
 * Bedrock client configured with:
 * - region: us-east-1
 * - credentials: from AWS Node.js credential provider chain
 */
export const bedrock = createAmazonBedrock({
  region: 'us-east-1',
  credentialProvider: fromNodeProviderChain(),
});
