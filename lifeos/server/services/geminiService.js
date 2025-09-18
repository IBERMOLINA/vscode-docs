const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Generate content using Gemini AI
   * @param {string} prompt - The prompt to send to Gemini
   * @param {Object} options - Optional configuration
   * @returns {Promise<string>} - The generated response
   */
  async generateContent(prompt, options = {}) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  /**
   * Generate content with streaming response
   * @param {string} prompt - The prompt to send to Gemini
   * @returns {AsyncGenerator} - Streaming response
   */
  async* generateContentStream(prompt) {
    try {
      const result = await this.model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error('Gemini Streaming Error:', error);
      throw new Error(`Failed to generate streaming content: ${error.message}`);
    }
  }

  /**
   * Analyze life metrics data using Gemini
   * @param {Object} metricsData - User's life metrics data
   * @returns {Promise<string>} - Analysis and insights
   */
  async analyzeLifeMetrics(metricsData) {
    const prompt = `
      As a life coach and data analyst, please analyze the following life metrics data and provide insights, trends, and actionable recommendations:

      ${JSON.stringify(metricsData, null, 2)}

      Please provide:
      1. Key trends and patterns
      2. Areas of improvement
      3. Positive achievements to celebrate
      4. Specific actionable recommendations
      5. Goals for the next week/month

      Keep the response structured, positive, and actionable.
    `;

    return this.generateContent(prompt);
  }

  /**
   * Generate daily reflection questions
   * @param {Object} context - User context (mood, activities, etc.)
   * @returns {Promise<string>} - Personalized reflection questions
   */
  async generateReflectionQuestions(context = {}) {
    const prompt = `
      Generate 3-5 thoughtful daily reflection questions for someone tracking their life metrics. 
      ${context.mood ? `Their current mood is: ${context.mood}` : ''}
      ${context.activities ? `Recent activities: ${context.activities.join(', ')}` : ''}
      
      Make the questions:
      - Thought-provoking but not overwhelming
      - Focused on growth and self-awareness
      - Actionable for tomorrow's planning
      
      Return as a simple numbered list.
    `;

    return this.generateContent(prompt);
  }

  /**
   * Get health insights based on metrics
   * @param {Object} healthData - Health-related metrics
   * @returns {Promise<string>} - Health insights and recommendations
   */
  async getHealthInsights(healthData) {
    const prompt = `
      Analyze the following health metrics and provide insights:
      
      ${JSON.stringify(healthData, null, 2)}
      
      Please provide:
      1. Overall health trends
      2. Areas that need attention
      3. Positive health patterns
      4. Specific recommendations for improvement
      
      Note: This is for informational purposes only and should not replace professional medical advice.
    `;

    return this.generateContent(prompt);
  }

  /**
   * Generate productivity insights
   * @param {Object} productivityData - Productivity metrics
   * @returns {Promise<string>} - Productivity analysis
   */
  async getProductivityInsights(productivityData) {
    const prompt = `
      Analyze the following productivity metrics and provide insights:
      
      ${JSON.stringify(productivityData, null, 2)}
      
      Focus on:
      1. Peak productivity patterns
      2. Time management insights
      3. Distraction patterns
      4. Optimization opportunities
      5. Work-life balance recommendations
    `;

    return this.generateContent(prompt);
  }

  /**
   * Test the connection to Gemini API
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    try {
      const result = await this.generateContent('Hello! Please respond with "Connection successful" if you can read this.');
      return result.toLowerCase().includes('connection successful');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

module.exports = GeminiService;