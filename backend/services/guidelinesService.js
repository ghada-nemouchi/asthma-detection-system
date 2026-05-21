// Simple in-memory vector search for GINA guidelines
// In production, you'd use a real vector database like Pinecone, Weaviate, or pgvector

// Sample GINA 2025 guideline chunks (you can expand this)
const guidelineChunks = [
  {
    id: 1,
    content: "GINA 2025 Step 1: As-needed low-dose ICS-formoterol for patients with mild asthma. This is the preferred reliever for all patients with asthma.",
    metadata: { section: "Step 1", topic: "treatment" }
  },
  {
    id: 2,
    content: "GINA 2025 Step 2: Low-dose ICS taken daily with as-needed low-dose ICS-formoterol as reliever.",
    metadata: { section: "Step 2", topic: "treatment" }
  },
  {
    id: 3,
    content: "GINA 2025 Step 3: Low-dose ICS-LABA as maintenance with as-needed low-dose ICS-formoterol as reliever.",
    metadata: { section: "Step 3", topic: "treatment" }
  },
  {
    id: 4,
    content: "GINA 2025 Step 4: Medium-dose ICS-LABA as maintenance with as-needed low-dose ICS-formoterol.",
    metadata: { section: "Step 4", topic: "treatment" }
  },
  {
    id: 5,
    content: "GINA 2025 Step 5: High-dose ICS-LABA + add-on therapy including LAMA, anti-IgE, anti-IL5/5R, anti-IL4R, or oral corticosteroids.",
    metadata: { section: "Step 5", topic: "treatment" }
  },
  {
    id: 6,
    content: "Asthma diagnosis in children 5 years and younger: GINA recommends assessing symptom patterns, response to treatment, and excluding alternative diagnoses. Diagnostic trials of ICS may be used.",
    metadata: { section: "Children", topic: "diagnosis" }
  },
  {
    id: 7,
    content: "New in GINA 2025: Updated recommendations for SMART therapy, simplified treatment steps, and emphasis on reducing SABA overuse.",
    metadata: { section: "What's New", topic: "updates" }
  }
];

// Simple keyword-based search (replace with proper vector search)
async function searchRelevantChunks(question, topK = 4) {
  const lowerQuestion = question.toLowerCase();
  
  // Score each chunk based on keyword matches
  const scored = guidelineChunks.map(chunk => {
    let score = 0;
    const keywords = lowerQuestion.split(' ');
    
    keywords.forEach(keyword => {
      if (keyword.length > 2) { // Ignore short words
        if (chunk.content.toLowerCase().includes(keyword)) {
          score += 1;
        }
        if (chunk.metadata.topic && chunk.metadata.topic === keyword) {
          score += 3;
        }
        if (chunk.metadata.section && chunk.metadata.section.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    });
    
    return { ...chunk, score };
  });
  
  // Sort by score and return top K
  const results = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(chunk => chunk.score > 0);
  
  // If no matches, return some default chunks
  if (results.length === 0) {
    return guidelineChunks.slice(0, topK).map(chunk => ({
      pageContent: chunk.content,
      metadata: chunk.metadata
    }));
  }
  
  return results.map(chunk => ({
    pageContent: chunk.content,
    metadata: chunk.metadata
  }));
}

module.exports = { searchRelevantChunks };