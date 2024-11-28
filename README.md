# SuperQuant - Application

SuperQuant is an AI-powered web tool that acts as a smart financial analyst for small and medium size companies. It uses LLM and Agent-based technology to understand complex financial data and find hidden insights. SuperQuant can:

- Analyze your company's financial information
- Discover important patterns and trends
- Suggest ways to increase revenue and profits
- Provide recommendations for better business decisions

This tool combines the latest developments in AI and language processing to offer powerful financial analysis capabilities.

## Technology Stack

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports Google (default), OpenAI, Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Vercel Postgres powered by Neon](https://vercel.com/storage/postgres) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient object storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run SuperQuant AI Application. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You will need to provide your own API keys for the AI SDK and other services in order to run the application.

```bash
bun install
bun dev
```

The app should now be running on [localhost:3000](http://localhost:3000/).
