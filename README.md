Claro, aquí tienes un README.md actualizado con la info que me diste, en formato claro y profesional, con secciones sobre los modos del chat legal, cómo correr el proyecto, y manteniendo la estructura inicial:

````markdown
# ⚖️ Legal Chat with Vercel AI SDK - Multi-Mode Example

This example demonstrates how to use the [Vercel AI SDK](https://sdk.vercel.ai/docs) with [Next.js](https://nextjs.org/) and the `useChat` hook to create a **legal chat interface** that supports **multi-modal messages** and three different modes of operation: **RAG**, **Default**, and **Workflow**.

---

## 🚀 Features

- **Three Chat Modes:**
  - **RAG (Retrieval-Augmented Generation):** Combines document retrieval with AI generation for context-aware answers.
  - **Default:** Basic chat mode with general AI responses.
  - **Workflow:** Specialized chat flow for handling legal workflows and structured prompts.

- **Multi-Modal Messaging:** Send and receive text, attachments, and files as part of the conversation.

- **Flexible AI Provider Support:** Easily switch between AI providers like OpenAI or Anthropic by configuring API keys.

---

## 📦 How to run the project locally

1. **Clone the repository or create a Next.js app from the example:**

```bash
npx create-next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments legal-chat-example
````

Or using Yarn:

```bash
yarn create next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments legal-chat-example
```

Or using pnpm:

```bash
pnpm create next-app --example https://github.com/vercel-labs/ai-sdk-preview-attachments legal-chat-example
```

2. **Sign up and obtain API keys** for the AI providers you want to use (e.g., [OpenAI](https://platform.openai.com), [Anthropic](https://www.anthropic.com)).

3. **Create a `.env` file** based on the `.env.example` and add your API keys and any required environment variables:

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Install dependencies:**

```bash
npm install
# or
yarn install
# or
pnpm install
```

5. **Run the development server:**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) to see the app in action.

---

## ⚙️ Chat Modes Explained

### 1. RAG (Retrieval-Augmented Generation) Mode

Uses external documents and knowledge bases to retrieve relevant information and combines it with AI-generated answers. Ideal for providing legal advice backed by specific documents.

### 2. Default Mode

Standard chat interface that interacts directly with the AI provider without document retrieval or specialized workflows. Suitable for quick, general legal questions.

### 3. Workflow Mode

Supports step-by-step legal workflows, structured prompts, and pre-built conversation templates to assist users with common legal processes or letter drafting.

---

## 🔗 Learn More

* [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
* [Next.js Documentation](https://nextjs.org/docs)
* [Vercel AI Playground](https://play.vercel.ai)

---

## 📥 Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-preview-attachments&env=OPENAI_API_KEY&envDescription=API%20keys%20needed%20for%20application&envLink=platform.openai.com)

---

Feel free to explore and customize this legal chat example to fit your needs!

```

Si quieres puedo ayudarte a agregar ejemplos específicos para cada modo o más detalles técnicos. ¿Quieres?
```
