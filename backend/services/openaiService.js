const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== 1. CONVERSATION MEMORY =====
// Store conversations by user/session ID
const conversationHistory = new Map(); // { sessionId: [{ role, content }] }

// ===== 2. RESPONSE CACHING =====
const responseCache = new Map(); // { cacheKey: { response, timestamp } }
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// ===== 3. FALLBACK RESPONSES =====
const getLocalFallbackResponse = (question) => {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('asthma') || lowerQuestion.includes('gina')) {
    return "Based on GINA 2025 guidelines: Asthma is a chronic inflammatory disease of the airways. For specific recommendations, please check your internet connection and try again, or consult the official GINA 2025 strategy report.";
  }
  
  if (lowerQuestion.includes('treatment') || lowerQuestion.includes('step')) {
    return "GINA 2025 recommends a stepwise approach to asthma treatment. Step 1: As-needed low-dose ICS-formoterol. Step 2: Low-dose ICS with as-needed reliever. Step 3: Low-dose ICS-LABA. For detailed guidance, please reconnect to the AI service.";
  }
  
  if (lowerQuestion.includes('diagnosis')) {
    return "GINA 2025 diagnosis criteria includes: variable respiratory symptoms, documented variable expiratory airflow limitation, and excludes alternative diagnoses. Please reconnect for complete diagnostic workflow.";
  }
  
  return "I'm currently experiencing connection issues. Please check your internet connection and try again. For urgent clinical questions, please refer to the GINA 2025 strategy report directly.";
};

// ===== MAIN FUNCTION WITH ALL ENHANCEMENTS =====
async function askOpenAI(question, context = '', sessionId = 'default') {
  try {
    // Check cache first
    const cacheKey = `${question}_${context.substring(0, 100)}`;
    const cached = responseCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Using cached response');
      return cached.response;
    }
    
    // Get conversation history for this session (last 5 exchanges = 10 messages)
    let history = conversationHistory.get(sessionId) || [];
    // Keep only last 10 messages (5 exchanges)
    if (history.length > 10) {
      history = history.slice(-10);
    }
    
    // Build messages array with history
    const messages = [
      { role: "system", content: context || "You are a helpful assistant specializing in GINA 2025 asthma guidelines." }
    ];
    
    // Add conversation history
    messages.push(...history);
    
    // Add current question
    messages.push({ role: "user", content: question });
    
    console.log(`💬 Session ${sessionId}: ${history.length/2} previous exchanges`);
    
    // Try OpenAI first
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini", // Your working model
      messages: messages,
      temperature: 0.7,
    });
    
    const response = completion.choices[0].message.content;
    
    // Update conversation history
    conversationHistory.set(sessionId, [
      ...history,
      { role: "user", content: question },
      { role: "assistant", content: response }
    ]);
    
    // Cache the response
    responseCache.set(cacheKey, {
      response: response,
      timestamp: Date.now()
    });
    
    // Clean old cache entries periodically (optional)
    if (responseCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          responseCache.delete(key);
        }
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback for quota issues
    if (error.message.includes('quota') || error.status === 429) {
      console.log('⚠️ Quota exceeded, using fallback response');
      return getLocalFallbackResponse(question);
    }
    
    // Other errors
    throw error;
  }
}

// Optional: Clear conversation history for a session
function clearConversation(sessionId) {
  conversationHistory.delete(sessionId);
  console.log(`🗑️ Cleared conversation for session ${sessionId}`);
}

// Optional: Get cache stats
function getCacheStats() {
  return {
    cacheSize: responseCache.size,
    activeSessions: conversationHistory.size,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
  };
}

module.exports = { 
  askOpenAI, 
  clearConversation, 
  getCacheStats 
};