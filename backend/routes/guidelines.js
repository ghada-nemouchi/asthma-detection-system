const express = require('express');
const router = express.Router();
const { searchRelevantChunks } = require('../services/guidelinesService');
const { askOpenAI } = require('../services/openaiService');
const { protect, doctorOnly } = require('../middleware/auth');

router.post('/query', protect, doctorOnly, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    console.log(`\n🤖 GINA Query: "${question}"`);
    
    // Search for relevant chunks
    const relevantChunks = await searchRelevantChunks(question, 4);
    
    if (!relevantChunks || relevantChunks.length === 0) {
      return res.json({
        success: true,
        answer: "I couldn't find specific information in the GINA 2025 guidelines for your question.",
        sources: [],
      });
    }
    
    // Prepare context
    const context = relevantChunks
      .map((chunk, i) => `[Section ${i + 1}]\n${chunk.pageContent}`)
      .join('\n\n');
    
    // Get answer from OpenAI
    const answer = await askOpenAI(question, context);
    
    res.json({
      success: true,
      question,
      answer,
      sources: relevantChunks.map((chunk, i) => ({
        id: i + 1,
        preview: chunk.pageContent.substring(0, 150) + '...'
      })),
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/suggested-questions', protect, doctorOnly, async (req, res) => {
  res.json({
    suggestedQuestions: [
      "What are the treatment steps for adults with asthma?",
      "How to diagnose asthma in children 5 years and younger?",
      "What's new in GINA 2025?",
      "How to manage severe asthma?",
      "What is the role of ICS-formoterol?"
    ]
  });
});

module.exports = router;