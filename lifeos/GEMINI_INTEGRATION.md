# Gemini API Integration Guide

## Setup Complete! ✅

Your Gemini API key has been successfully added to the lifeos project.

## Configuration

Your Gemini API key is stored in the `.env` file:
```
GEMINI_API_KEY=AIzaSyAfPx54xX4pjQAqCANbilGpr-zldWjQF8k
```

**Important Security Notes:**
- The `.env` file is already added to `.gitignore` to prevent accidental commits
- Never share your API key publicly
- Consider rotating your API key periodically for security

## Available Endpoints

### 1. Text Generation
**Endpoint:** `POST /api/gemini/generate`

**Request Body:**
```json
{
  "prompt": "Your text prompt here",
  "model": "gemini-pro",  // optional, defaults to "gemini-pro"
  "maxTokens": 1000       // optional, defaults to 1000
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3001/api/gemini/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Write a haiku about programming'
  })
});
```

### 2. Chat Conversation
**Endpoint:** `POST /api/gemini/chat`

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "How are you?" }
  ],
  "model": "gemini-pro"  // optional
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3001/api/gemini/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Explain React hooks' }
    ]
  })
});
```

## Available Models

- `gemini-pro`: Text generation and chat
- `gemini-pro-vision`: Multimodal (text + images) - requires additional setup

## Running the Application

1. Start the server:
```bash
npm run server
# or for development with auto-reload:
npm run dev
```

2. The Gemini endpoints will be available at:
   - `http://localhost:3001/api/gemini/generate`
   - `http://localhost:3001/api/gemini/chat`

3. Check the health endpoint to verify Gemini is configured:
```bash
curl http://localhost:3001/api/health
```

The response will include `"geminiConfigured": true` if everything is set up correctly.

## Example Usage

Check the `examples/gemini-api-usage.js` file for complete examples of:
- Simple text generation
- Chat conversations
- React component integration

## Rate Limits and Pricing

Be aware of Google's rate limits and pricing for the Gemini API:
- Free tier includes limited requests per minute
- Check [Google AI Studio](https://makersuite.google.com/app/apikey) for your usage
- Consider implementing rate limiting in production

## Troubleshooting

1. **API Key Not Working:**
   - Verify the key is correct in `.env`
   - Check if the key has the necessary permissions
   - Ensure you've enabled the Gemini API in Google Cloud Console

2. **Server Not Loading Environment Variables:**
   - Make sure the `.env` file is in the root of the lifeos directory
   - Restart the server after changing `.env`
   - Check that `dotenv` is installed: `npm list dotenv`

3. **Rate Limit Errors:**
   - Implement caching for repeated queries
   - Add rate limiting middleware
   - Consider upgrading your API plan

## Next Steps

1. Implement error handling and retry logic
2. Add request validation and sanitization
3. Set up monitoring and logging for API usage
4. Consider adding a queue system for handling multiple requests
5. Implement user authentication to control access to Gemini endpoints

## Support

For issues with:
- Gemini API: Check [Google AI Documentation](https://ai.google.dev/)
- This integration: Review the server logs and check the `/api/health` endpoint