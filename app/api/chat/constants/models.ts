/**
 * Contains model identifiers for different AI providers.
 *
 * Grouped by provider (e.g., OpenAI, Anthropic, Google, Groq), each group defines
 * default and specialized model variants used for various tasks such as chat, embeddings,
 * and reasoning.
 *
 * @constant
 * @type {Object}
 * @property {Object} OPENAI - OpenAI model configurations.
 * @property {string} OPENAI.DEFAULT - Default model (e.g., GPT-4o).
 * @property {string} OPENAI.EMBEDDING - Model used for embedding tasks.
 * @property {string} OPENAI.CHEAPEST - Budget-friendly model (e.g., GPT-3.5 Turbo).
 *
 * @property {Object} ANTHROPIC - Anthropic model configurations.
 * @property {string} ANTHROPIC.DEFAULT - Default Claude model.
 * @property {string} ANTHROPIC.REASONING - Specialized Claude model for reasoning tasks.
 * @property {string} ANTHROPIC.EMBEDDING - Embedding model provided by Amazon Titan.
 *
 * @property {Object} GOOGLE - Google model configurations.
 * @property {string} GOOGLE.DEFAULT - Default Gemini model.
 *
 * @property {Object} GROQ - Groq model configurations.
 * @property {string} GROQ.DEFAULT - Default Gemma model.
 */

export const MODEL_CONSTANTS = {
  OPENAI: {
    DEFAULT: "gpt-4o",
    EMBEDDING: "text-embedding-3-small",
    CHEAPEST: "gpt-3.5-turbo",
  },
  ANTHROPIC: {
    DEFAULT: "claude-3-7-sonnet-20250219",
    REASONING: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    EMBEDDING: "amazon.titan-embed-text-v2:0",
  },
  GOOGLE: {
    DEFAULT: "gemini-2.5-flash-preview-04-17",
  },
  GROQ: {
    DEFAULT: "gemma2-9b-it",
  },
};
