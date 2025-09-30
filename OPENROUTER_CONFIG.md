# OpenRouter Configuration

To use OpenRouter as an LLM provider, add the following environment variables to your `.env` file:

## Required Variables

```bash
# OpenRouter API Key (required)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# Default model to use (required)
OPENROUTER_MODEL=openai/gpt-4o
```

## Optional Variables

```bash
# OpenRouter base URL (defaults to https://openrouter.ai/api/v1)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Site URL for OpenRouter rankings (optional)
OPENROUTER_SITE_URL=http://localhost:3001

# Site name for OpenRouter rankings (optional)
OPENROUTER_SITE_NAME=Filmchi
```

## Supported Models

The OpenRouter provider supports many models including:

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-haiku`
- `anthropic/claude-3-opus`
- `google/gemini-pro`
- `meta-llama/llama-3.1-8b-instruct`
- `meta-llama/llama-3.1-70b-instruct`
- `mistralai/mistral-7b-instruct`
- `mistralai/mixtral-8x7b-instruct`

## Usage

Once configured, you can use OpenRouter through the existing LLM service:

```typescript
// The service will automatically use OpenRouter if it's available
const response = await llmService.generateCompletion({
  prompt: "What is the meaning of life?",
  model: "openai/gpt-4o", // Optional, will use default if not specified
  temperature: 0.7,
  maxTokens: 1000
});
```

## Getting an API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key from your dashboard
4. Add the key to your environment variables
