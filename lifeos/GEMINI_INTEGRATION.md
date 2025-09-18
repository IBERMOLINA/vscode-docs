# Gemini AI Integration Guide

This guide explains how to set up and use the Gemini AI integration in LifeOS.

## Setup

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the generated API key

### 2. Configure Environment Variables

1. Open the `.env` file in the root of your lifeos project
2. Replace `your_gemini_api_key_here` with your actual API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Start the Application

**For Development:**
```bash
npm run dev
```

**For Production with Docker:**
```bash
# Set the environment variable for Docker
export GEMINI_API_KEY=your_actual_api_key_here
docker-compose up -d
```

## Available API Endpoints

### 1. Test Connection
```bash
GET /api/gemini/test
```
Tests if the Gemini API is properly configured and accessible.

### 2. Generate Content
```bash
POST /api/gemini/generate
Content-Type: application/json

{
  "prompt": "Your prompt here"
}
```

### 3. Analyze Life Metrics
```bash
POST /api/gemini/analyze-metrics
Content-Type: application/json

{
  "metricsData": {
    "sleep": 7.5,
    "exercise": 30,
    "mood": 8,
    "productivity": 7,
    "date": "2024-01-15"
  }
}
```

### 4. Generate Reflection Questions
```bash
POST /api/gemini/reflection-questions
Content-Type: application/json

{
  "context": {
    "mood": "good",
    "activities": ["work", "exercise", "reading"]
  }
}
```

### 5. Health Insights
```bash
POST /api/gemini/health-insights
Content-Type: application/json

{
  "healthData": {
    "sleep": 7.5,
    "steps": 8500,
    "heartRate": 72,
    "weight": 70
  }
}
```

### 6. Productivity Insights
```bash
POST /api/gemini/productivity-insights
Content-Type: application/json

{
  "productivityData": {
    "focusTime": 4.5,
    "distractions": 12,
    "tasksCompleted": 8,
    "meetingTime": 2
  }
}
```

## Example Usage

### JavaScript/Frontend Integration

```javascript
// Test Gemini connection
async function testGeminiConnection() {
  try {
    const response = await fetch('/api/gemini/test');
    const data = await response.json();
    console.log('Gemini status:', data.message);
  } catch (error) {
    console.error('Error testing Gemini:', error);
  }
}

// Analyze life metrics
async function analyzeMetrics(metrics) {
  try {
    const response = await fetch('/api/gemini/analyze-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metricsData: metrics })
    });
    
    const data = await response.json();
    console.log('Analysis:', data.analysis);
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing metrics:', error);
  }
}

// Generate reflection questions
async function getReflectionQuestions(context = {}) {
  try {
    const response = await fetch('/api/gemini/reflection-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context })
    });
    
    const data = await response.json();
    console.log('Questions:', data.questions);
    return data.questions;
  } catch (error) {
    console.error('Error getting reflection questions:', error);
  }
}
```

### cURL Examples

```bash
# Test connection
curl -X GET http://localhost:3001/api/gemini/test

# Analyze metrics
curl -X POST http://localhost:3001/api/gemini/analyze-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "metricsData": {
      "sleep": 7.5,
      "exercise": 30,
      "mood": 8,
      "productivity": 7
    }
  }'

# Get reflection questions
curl -X POST http://localhost:3001/api/gemini/reflection-questions \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "mood": "good",
      "activities": ["work", "exercise"]
    }
  }'
```

## Features

The Gemini integration provides:

1. **Life Metrics Analysis**: Get AI-powered insights into your daily metrics
2. **Reflection Questions**: Generate personalized daily reflection prompts
3. **Health Insights**: Analyze health data and get recommendations
4. **Productivity Analysis**: Understand your productivity patterns
5. **General Content Generation**: Use Gemini for any custom prompts

## Error Handling

- If the Gemini API key is not configured, endpoints will return a 503 status
- Invalid requests return 400 status with error details
- API failures return 500 status with error information

## Security Notes

- The `.env` file is automatically added to `.gitignore` to prevent committing your API key
- Never commit your actual API key to version control
- In production, use environment variables or secure secret management

## Troubleshooting

1. **"Gemini service not available" error**: Check that your API key is correctly set in the `.env` file
2. **Connection test fails**: Verify your API key is valid and you have internet connectivity
3. **Rate limiting**: Gemini has usage limits; check your quota in Google AI Studio

## Rate Limits and Costs

- Free tier: 15 requests per minute, 1,500 requests per day
- Check current pricing at [Google AI Pricing](https://ai.google.dev/pricing)
- Monitor your usage in Google AI Studio